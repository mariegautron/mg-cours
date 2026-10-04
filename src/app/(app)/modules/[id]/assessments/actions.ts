"use server";

import { SCHOOL_GRADE_TYPE, validateSchoolGrade } from "@/lib/assessments/module-notes";
import { prepareMakeupInAdvance } from "@/app/(app)/modules/[id]/assessments/makeup-action";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ASSESSMENT_FILES_BUCKET, type AssessmentFile } from "@/lib/assessments/files";
import { makeupInvariants } from "@/lib/assessments/makeup";
import { readAssessmentForm } from "@/lib/assessments/schema";
import { parseResourceFiles, upsertFile } from "@/lib/resources/files";
import { createClient } from "@/lib/supabase/server";
import {
  individualValueFor,
  isAttendance,
  readMemberOverrides,
  type Attendance,
} from "@/lib/assessments/attendance";
import { parseCriterionComments, readFeedback } from "@/lib/assessments/feedback";
import { computeTotals, hasScoredInput, readScores } from "@/lib/assessments/scoring";
import { failure, NOT_FOUND, SESSION_EXPIRED } from "@/lib/messages";

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

/**
 * Au moins un groupe est exigé seulement quand le module en a : on peut prévoir les évaluations
 * avant l'arrivée des étudiant·es. Les groupes créés ensuite les rejoignent
 * (`attachGroupsToUngroupedAssessments`).
 */
async function groupRequired(supabase: Supabase, moduleId: string, groupIds: string[]) {
  if (groupIds.length > 0) return false;
  const { count } = await supabase
    .from("student_group")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId);
  return (count ?? 0) > 0;
}

export async function createAssessment(
  moduleId: string,
  _prev: AssessmentFormState,
  formData: FormData,
): Promise<AssessmentFormState> {
  const parsed = readAssessmentForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const groupIds = parsed.data.studentGroupIds;
  const supabase = await createClient();
  if (await groupRequired(supabase, moduleId, groupIds)) {
    return { fieldErrors: { studentGroupIds: ["Choisis au moins un groupe."] } };
  }
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

  if (error || !data) return { error: failure("enregistrer", { kept: true }) };

  const { error: groupsError } = groupIds.length
    ? await supabase
        .from("assessment_group")
        .insert(groupIds.map((student_group_id) => ({ assessment_id: data.id, student_group_id })))
    : { error: null };
  if (groupsError) {
    await supabase.from("assessment").delete().eq("id", data.id);
    return { error: failure("enregistrer", { kept: true }) };
  }

  // Rattrapage préparé d'avance (US-144, option) : un échec ne bloque pas la création.
  if (formData.get("prepareMakeup") === "on" && !parsed.data.isGroupGrade) {
    await prepareMakeupInAdvance(moduleId, data.id);
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
  if (await groupRequired(supabase, moduleId, groupIds)) {
    return { fieldErrors: { studentGroupIds: ["Choisis au moins un groupe."] } };
  }
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

  // Un rattrapage garde la grille, le coefficient et le barème de l'évaluation d'origine (US-96).
  const { data: makeupRow } = await supabase
    .from("assessment")
    .select("makeup_of_id")
    .eq("id", assessmentId)
    .maybeSingle();
  const { data: origin } = makeupRow?.makeup_of_id
    ? await supabase
        .from("assessment")
        .select("grading_grid_id, coefficient, max_score, auto_validated_criterion_ids")
        .eq("id", makeupRow.makeup_of_id)
        .maybeSingle()
    : { data: null };

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
      ...(origin ? makeupInvariants(origin) : {}),
    })
    .eq("id", assessmentId);

  if (error) {
    console.error("[évaluation] enregistrement impossible", error);
    return { error: failure("enregistrer l’évaluation", { kept: true }) };
  }

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
    if (addError) return { error: failure("enregistrer", { kept: true }) };
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
    if (removeError || gradeError) return { error: failure("enregistrer", { kept: true }) };
  }

  revalidatePath(`/modules/${moduleId}/assessments`);
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}`);
  redirect(`/modules/${moduleId}/assessments/${assessmentId}`);
}

export async function deleteAssessment(moduleId: string, assessmentId: string) {
  "use server";
  const supabase = await createClient();
  // Le rattrapage disparaît avec son évaluation d'origine (cascade) : ses fichiers aussi.
  const { data: assessments } = await supabase
    .from("assessment")
    .select("files")
    .or(`id.eq.${assessmentId},makeup_of_id.eq.${assessmentId}`);
  const { error } = await supabase.from("assessment").delete().eq("id", assessmentId);
  // Les fichiers du sujet ne servent plus à rien : on les retire du stockage privé.
  const paths = (assessments ?? []).flatMap((a) => parseResourceFiles(a.files).map((f) => f.path));
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
  if (!assessment) return { error: NOT_FOUND.assessment };

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
    [...new Set(criteria.flatMap((c) => (c.axisId ? [c.axisId] : [])))],
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
    if (!Number.isFinite(num)) return { error: "Saisis une note." };
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
  if (saved.error || !saved.data) return { error: failure("enregistrer") };

  if (memberOverrides && "overrides" in memberOverrides) {
    const gradeId = saved.data.id;
    const { error: clearError } = await supabase
      .from("group_grade_member")
      .delete()
      .eq("grade_id", gradeId);
    if (clearError) return { error: failure("enregistrer") };
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
      if (insertError) return { error: failure("enregistrer") };
    }
  }

  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}`);
  revalidatePath(`/modules/${moduleId}`);
  return { saved: true };
}

/**
 * Une cellule de la comparaison d'un critère (US-141) : change les points et le commentaire d'UN
 * critère d'une copie. Tout le reste de la copie est conservé : on rejoue l'enregistrement normal
 * (`saveGrade`) avec le contenu actuel de la copie, pour que la note soit recalculée comme partout.
 */
export async function saveCriterionCell(
  moduleId: string,
  assessmentId: string,
  copy: { kind: "group" | "student"; id: string },
  criterionId: string,
  points: number | null,
  comment: string,
): Promise<GradeFormState> {
  if (points !== null && (!Number.isFinite(points) || points < 0)) {
    return { error: "Les points doivent être un nombre positif." };
  }
  const supabase = await createClient();
  const { data: assessment } = await supabase
    .from("assessment")
    .select("grading_grid:grading_grid_id(grid_criterion(id, axis_id))")
    .eq("id", assessmentId)
    .eq("module_id", moduleId)
    .maybeSingle();
  if (!assessment) return { error: NOT_FOUND.assessment };
  const grid = assessment.grading_grid as {
    grid_criterion: { id: string; axis_id: string | null }[];
  } | null;
  const criteria = grid?.grid_criterion ?? [];
  if (!criteria.some((c) => c.id === criterionId)) return { error: "Ce critère n’existe plus." };

  const target =
    copy.kind === "group"
      ? { studentId: null, studentGroupId: copy.id }
      : { studentId: copy.id, studentGroupId: null };
  const match =
    copy.kind === "group"
      ? { assessment_id: assessmentId, student_group_id: copy.id }
      : { assessment_id: assessmentId, student_id: copy.id };
  const { data: current } = await supabase.from("grade").select("*").match(match).maybeSingle();

  const scores = (current?.scores ?? {}) as Record<string, number>;
  const comments = parseCriterionComments(current?.criterion_comments);
  const form = new FormData();
  for (const c of criteria) {
    const value = c.id === criterionId ? points : (scores[c.id] ?? null);
    if (value !== null && value !== undefined) form.set(`score_${c.id}`, String(value));
    const text = c.id === criterionId ? comment : (comments[c.id] ?? "");
    form.set(`comment_${c.id}`, text);
    if (c.axis_id) form.set(`comment_axis:${c.axis_id}`, comments[`axis:${c.axis_id}`] ?? "");
  }
  form.set("strengths", current?.strengths ?? "");
  form.set("progress", current?.progress ?? "");
  form.set("feedback", current?.feedback ?? "");
  form.set("attendance", current?.attendance ?? "present");
  for (const id of current?.predefined_comment_ids ?? []) form.append("predefinedCommentIds", id);
  return saveGrade(moduleId, assessmentId, target, form);
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
  if (!auth.user) return { error: SESSION_EXPIRED };
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
    return { error: NOT_FOUND.assessment };
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
    return { error: failure("enregistrer") };
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

export interface SchoolGradeState {
  error?: string;
}

/**
 * « Note de l'école » (US-126) : note imposée par l'école (contrôle continu), sans sujet ni grille.
 * Individuelle, pour tous les groupes du module : on saisit ensuite les notes directement.
 */
export async function createSchoolGrade(
  moduleId: string,
  _prev: SchoolGradeState,
  formData: FormData,
): Promise<SchoolGradeState> {
  const check = validateSchoolGrade({
    title: String(formData.get("title") ?? ""),
    coefficient: String(formData.get("coefficient") ?? "1"),
  });
  if (!check.ok) return { error: check.error };

  const supabase = await createClient();
  const { data: groups } = await supabase
    .from("student_group")
    .select("id")
    .eq("module_id", moduleId);
  if (!groups) return { error: failure("enregistrer", { kept: true }) };
  const { data, error } = await supabase
    .from("assessment")
    .insert({
      module_id: moduleId,
      title: check.title,
      type: SCHOOL_GRADE_TYPE,
      coefficient: check.coefficient,
      is_group_grade: false,
      max_score: 20,
      prep_status: "provided",
    })
    .select("id")
    .single();
  if (error || !data) return { error: failure("enregistrer", { kept: true }) };
  const { error: groupsError } = groups.length
    ? await supabase
        .from("assessment_group")
        .insert(groups.map((g) => ({ assessment_id: data.id, student_group_id: g.id })))
    : { error: null };
  if (groupsError) {
    await supabase.from("assessment").delete().eq("id", data.id);
    return { error: failure("enregistrer", { kept: true }) };
  }
  revalidatePath(`/modules/${moduleId}/assessments`);
  redirect(`/modules/${moduleId}/assessments/${data.id}`);
}
