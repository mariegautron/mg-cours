"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ASSESSMENT_FILES_BUCKET, type AssessmentFile } from "@/lib/assessments/files";
import { readAssessmentForm } from "@/lib/assessments/schema";
import { parseResourceFiles, upsertFile } from "@/lib/resources/files";
import { createClient } from "@/lib/supabase/server";
import {
  individualValueFor,
  isAttendance,
  readMemberOverrides,
  type Attendance,
} from "@/lib/assessments/attendance";
import { readFeedback } from "@/lib/assessments/feedback";
import { computeTotals, hasScoredInput, readScores } from "@/lib/assessments/scoring";

export interface AssessmentFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function flatten(fieldErrors: Record<string, string[] | undefined>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(([, v]) => v && v.length) as [string, string[]][],
  );
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Critères validés d'office conservés : ceux qui appartiennent à la grille choisie (changer de grille
 * en retire les critères de l'ancienne) et qui ne sont pas des bonus.
 */
async function keepAutoValidated(
  supabase: Supabase,
  gridId: string | null,
  ids: string[],
): Promise<string[]> {
  if (!gridId || ids.length === 0) return [];
  const { data } = await supabase
    .from("grid_criterion")
    .select("id")
    .eq("grading_grid_id", gridId)
    .eq("is_bonus", false)
    .in("id", ids);
  return (data ?? []).map((c) => c.id);
}

/** Vrai si tous les groupes appartiennent au module (la RLS garantit déjà la propriété). */
async function groupsBelongToModule(supabase: Supabase, moduleId: string, groupIds: string[]) {
  const { count } = await supabase
    .from("student_group")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId)
    .in("id", groupIds);
  return count === groupIds.length;
}

/** Vrai si la séance appartient au module (`null` : pas de séance, toujours valide). */
async function courseBelongsToModule(
  supabase: Supabase,
  moduleId: string,
  courseId: string | null,
) {
  if (!courseId) return true;
  const { count } = await supabase
    .from("course")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId)
    .eq("id", courseId);
  return count === 1;
}

const subjectColumns = (d: {
  objective: string | null;
  deliverableMd: string | null;
  evaluatedMd: string | null;
  experienceNote: string | null;
  courseId: string | null;
  prepStatus: string;
}) => ({
  objective: d.objective,
  deliverable_md: d.deliverableMd,
  evaluated_md: d.evaluatedMd,
  experience_note: d.experienceNote,
  course_id: d.courseId,
  prep_status: d.prepStatus as "to_build" | "ready" | "provided",
});

export async function createAssessment(
  moduleId: string,
  _prev: AssessmentFormState,
  formData: FormData,
): Promise<AssessmentFormState> {
  const parsed = readAssessmentForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const groupIds = parsed.data.studentGroupIds;
  const supabase = await createClient();
  if (!(await groupsBelongToModule(supabase, moduleId, groupIds))) {
    return { fieldErrors: { studentGroupIds: ["Groupe inconnu pour ce module."] } };
  }
  if (!(await courseBelongsToModule(supabase, moduleId, parsed.data.courseId))) {
    return { fieldErrors: { courseId: ["Séance inconnue pour ce module."] } };
  }

  const autoValidated = await keepAutoValidated(
    supabase,
    parsed.data.gradingGridId,
    parsed.data.autoValidatedCriterionIds,
  );

  const { data, error } = await supabase
    .from("assessment")
    .insert({
      module_id: moduleId,
      title: parsed.data.title,
      subject: parsed.data.subject || null,
      type: parsed.data.type || null,
      coefficient: parsed.data.coefficient,
      date: parsed.data.date,
      duration_minutes: parsed.data.durationMinutes,
      grading_grid_id: parsed.data.gradingGridId,
      is_group_grade: parsed.data.isGroupGrade,
      max_score: parsed.data.maxScore,
      auto_validated_criterion_ids: autoValidated,
      ...subjectColumns(parsed.data),
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Enregistrement impossible." };

  const { error: groupsError } = await supabase
    .from("assessment_group")
    .insert(groupIds.map((student_group_id) => ({ assessment_id: data.id, student_group_id })));
  if (groupsError) {
    await supabase.from("assessment").delete().eq("id", data.id);
    return { error: "Enregistrement impossible." };
  }

  revalidatePath(`/modules/${moduleId}/assessments`);
  redirect(`/modules/${moduleId}/assessments/${data.id}`);
}

export async function updateAssessment(
  moduleId: string,
  assessmentId: string,
  _prev: AssessmentFormState,
  formData: FormData,
): Promise<AssessmentFormState> {
  const parsed = readAssessmentForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const groupIds = parsed.data.studentGroupIds;
  const supabase = await createClient();
  if (!(await groupsBelongToModule(supabase, moduleId, groupIds))) {
    return { fieldErrors: { studentGroupIds: ["Groupe inconnu pour ce module."] } };
  }
  if (!(await courseBelongsToModule(supabase, moduleId, parsed.data.courseId))) {
    return { fieldErrors: { courseId: ["Séance inconnue pour ce module."] } };
  }

  const autoValidated = await keepAutoValidated(
    supabase,
    parsed.data.gradingGridId,
    parsed.data.autoValidatedCriterionIds,
  );

  const { error } = await supabase
    .from("assessment")
    .update({
      title: parsed.data.title,
      subject: parsed.data.subject || null,
      type: parsed.data.type || null,
      coefficient: parsed.data.coefficient,
      date: parsed.data.date,
      duration_minutes: parsed.data.durationMinutes,
      grading_grid_id: parsed.data.gradingGridId,
      is_group_grade: parsed.data.isGroupGrade,
      max_score: parsed.data.maxScore,
      auto_validated_criterion_ids: autoValidated,
      ...subjectColumns(parsed.data),
    })
    .eq("id", assessmentId);

  if (error) return { error: "Enregistrement impossible." };

  const { data: current } = await supabase
    .from("assessment_group")
    .select("student_group_id")
    .eq("assessment_id", assessmentId);
  const currentIds = (current ?? []).map((r) => r.student_group_id);
  const added = groupIds.filter((g) => !currentIds.includes(g));
  const removed = currentIds.filter((g) => !groupIds.includes(g));

  if (added.length) {
    const { error: addError } = await supabase
      .from("assessment_group")
      .insert(added.map((student_group_id) => ({ assessment_id: assessmentId, student_group_id })));
    if (addError) return { error: "Enregistrement impossible." };
  }
  if (removed.length) {
    // Les notes de groupe des groupes retirés disparaissent (sinon elles compteraient encore) ;
    // les notes individuelles sont conservées.
    const [{ error: removeError }, { error: gradeError }] = await Promise.all([
      supabase
        .from("assessment_group")
        .delete()
        .eq("assessment_id", assessmentId)
        .in("student_group_id", removed),
      supabase
        .from("grade")
        .delete()
        .eq("assessment_id", assessmentId)
        .in("student_group_id", removed),
    ]);
    if (removeError || gradeError) return { error: "Enregistrement impossible." };
  }

  revalidatePath(`/modules/${moduleId}/assessments`);
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}`);
  redirect(`/modules/${moduleId}/assessments/${assessmentId}`);
}

export async function deleteAssessment(moduleId: string, assessmentId: string) {
  "use server";
  const supabase = await createClient();
  const { data: assessment } = await supabase
    .from("assessment")
    .select("files")
    .eq("id", assessmentId)
    .maybeSingle();
  const { error } = await supabase.from("assessment").delete().eq("id", assessmentId);
  // Les fichiers du sujet ne servent plus à rien : on les retire du stockage privé.
  const paths = parseResourceFiles(assessment?.files).map((f) => f.path);
  if (!error && paths.length) await supabase.storage.from(ASSESSMENT_FILES_BUCKET).remove(paths);
  revalidatePath(`/modules/${moduleId}/assessments`);
  redirect(`/modules/${moduleId}/assessments`);
}

export interface GradeFormState {
  error?: string;
  saved?: boolean;
}

async function saveGrade(
  moduleId: string,
  assessmentId: string,
  target: { studentId: string | null; studentGroupId: string | null },
  formData: FormData,
): Promise<GradeFormState> {
  const predefinedCommentIds = formData.getAll("predefinedCommentIds").map(String);
  // Présence d'un·e étudiant·e (note individuelle) ; une note de groupe reste toujours « présent·e ».
  const rawAttendance = formData.get("attendance");
  const attendance: Attendance =
    target.studentId && isAttendance(rawAttendance) ? rawAttendance : "present";

  const supabase = await createClient();
  const { data: assessment } = await supabase
    .from("assessment")
    .select(
      "max_score, auto_validated_criterion_ids, grading_grid:grading_grid_id(grid_criterion(id, weight, axis_id, is_bonus))",
    )
    .eq("id", assessmentId)
    .maybeSingle();
  if (!assessment) return { error: "Évaluation introuvable." };

  const grid = assessment.grading_grid as {
    grid_criterion: { id: string; weight: number; axis_id: string | null; is_bonus: boolean }[];
  } | null;
  const criteria = (grid?.grid_criterion ?? []).map((c) => ({
    id: c.id,
    weight: c.weight,
    axisId: c.axis_id,
    isBonus: c.is_bonus,
  }));

  const text = readFeedback(
    formData,
    criteria.map((c) => c.id),
  );

  let value: number | null;
  let scores: Record<string, number> = {};
  if (criteria.length > 0) {
    // Total (bonus inclus) ramené au barème puis plafonné à ce barème (`computeTotals`).
    const autoValidatedIds = assessment.auto_validated_criterion_ids;
    scores = readScores(formData.entries(), criteria);
    for (const id of autoValidatedIds) delete scores[id];
    // Copie sans aucun critère noté (ex. seulement des commentaires) : pas de note, jamais un faux 0.
    value = hasScoredInput(criteria, scores, autoValidatedIds)
      ? computeTotals(criteria, scores, { autoValidatedIds, maxScore: assessment.max_score }).value
      : null;
  } else if (attendance !== "present") {
    value = null;
  } else {
    const raw = formData.get("value");
    const num = typeof raw === "string" && raw !== "" ? Number(raw.replace(",", ".")) : Number.NaN;
    if (!Number.isFinite(num)) return { error: "Saisissez une note." };
    const maxScore = assessment.max_score ?? 20;
    if (num < 0 || num > maxScore) {
      return { error: `La note doit être comprise entre 0 et ${maxScore}.` };
    }
    value = num;
  }
  // Absent·e non prévenu·e : 0 automatique ; excusé·e : pas de note (hors moyenne).
  if (target.studentId) value = individualValueFor(attendance, value);

  // Note de groupe : ajustements individuels (absence, pondération justifiée) sans toucher à la note.
  let memberOverrides: ReturnType<typeof readMemberOverrides> | null = null;
  if (target.studentGroupId && formData.get("memberOverrides") === "1") {
    const { data: rows } = await supabase
      .from("group_member")
      .select("student:student_id(id, first_name, last_name)")
      .eq("student_group_id", target.studentGroupId);
    const members = (rows ?? [])
      .map((r) => r.student as { id: string; first_name: string; last_name: string } | null)
      .filter((m) => m !== null)
      .map((m) => ({ id: m.id, name: `${m.first_name} ${m.last_name}` }));
    memberOverrides = readMemberOverrides(formData, members);
    if ("error" in memberOverrides) return { error: memberOverrides.error };
  }

  const match = target.studentId
    ? { assessment_id: assessmentId, student_id: target.studentId }
    : { assessment_id: assessmentId, student_group_id: target.studentGroupId };

  const { data: existing } = await supabase.from("grade").select("id").match(match).maybeSingle();

  const row = {
    assessment_id: assessmentId,
    student_id: target.studentId,
    student_group_id: target.studentGroupId,
    is_group_grade: target.studentId === null,
    value,
    attendance,
    scores,
    feedback: text.feedback,
    strengths: text.strengths,
    progress: text.progress,
    criterion_comments: text.criterionComments,
    predefined_comment_ids: predefinedCommentIds,
  };

  const saved = existing
    ? await supabase.from("grade").update(row).eq("id", existing.id).select("id").single()
    : await supabase.from("grade").insert(row).select("id").single();
  if (saved.error || !saved.data) return { error: "Enregistrement impossible." };

  if (memberOverrides && "overrides" in memberOverrides) {
    const gradeId = saved.data.id;
    const { error: clearError } = await supabase
      .from("group_grade_member")
      .delete()
      .eq("grade_id", gradeId);
    if (clearError) return { error: "Enregistrement impossible." };
    if (memberOverrides.overrides.size > 0) {
      const { error: insertError } = await supabase.from("group_grade_member").insert(
        [...memberOverrides.overrides].map(([studentId, o]) => ({
          grade_id: gradeId,
          student_id: studentId,
          attendance: o.attendance,
          individual_factor: o.factor,
          justification: o.justification,
        })),
      );
      if (insertError) return { error: "Enregistrement impossible." };
    }
  }

  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}`);
  revalidatePath(`/modules/${moduleId}`);
  return { saved: true };
}

export async function saveGroupGrade(
  moduleId: string,
  assessmentId: string,
  studentGroupId: string,
  _prev: GradeFormState,
  formData: FormData,
): Promise<GradeFormState> {
  return saveGrade(moduleId, assessmentId, { studentId: null, studentGroupId }, formData);
}

export async function saveStudentGrade(
  moduleId: string,
  assessmentId: string,
  studentId: string,
  _prev: GradeFormState,
  formData: FormData,
): Promise<GradeFormState> {
  return saveGrade(moduleId, assessmentId, { studentId, studentGroupId: null }, formData);
}

/**
 * Le fichier part directement du navigateur vers Supabase Storage (les fonctions serveur plafonnent
 * les requêtes à quelques Mo). Cette action l'ajoute ensuite à assessment.files ; un fichier du même
 * nom remplace l'ancien.
 */
export async function registerAssessmentFile(
  assessmentId: string,
  file: AssessmentFile,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Session expirée." };
  if (!file.path.startsWith(`${auth.user.id}/${assessmentId}/`))
    return { error: "Chemin invalide." };

  const storage = supabase.storage.from(ASSESSMENT_FILES_BUCKET);
  const { data: assessment } = await supabase
    .from("assessment")
    .select("files, module_id")
    .eq("id", assessmentId)
    .maybeSingle();
  if (!assessment) {
    await storage.remove([file.path]);
    return { error: "Évaluation introuvable." };
  }

  const { files, replacedPath } = upsertFile(parseResourceFiles(assessment.files), {
    path: file.path,
    name: file.name.slice(0, 255),
    size: file.size,
    mime: file.mime,
  });
  const { error } = await supabase.from("assessment").update({ files }).eq("id", assessmentId);
  if (error) {
    await storage.remove([file.path]);
    return { error: "Enregistrement impossible. Réessayez." };
  }
  if (replacedPath) await storage.remove([replacedPath]);

  revalidatePath(`/modules/${assessment.module_id}/assessments/${assessmentId}`);
  return {};
}

export async function deleteAssessmentFile(assessmentId: string, path: string) {
  const supabase = await createClient();
  const { data: assessment } = await supabase
    .from("assessment")
    .select("files, module_id")
    .eq("id", assessmentId)
    .maybeSingle();
  if (!assessment) return;
  const files = parseResourceFiles(assessment.files);
  if (!files.some((f) => f.path === path)) return;

  const { error } = await supabase
    .from("assessment")
    .update({ files: files.filter((f) => f.path !== path) })
    .eq("id", assessmentId);
  if (error) return;
  await supabase.storage.from(ASSESSMENT_FILES_BUCKET).remove([path]);
  revalidatePath(`/modules/${assessment.module_id}/assessments/${assessmentId}`);
}
