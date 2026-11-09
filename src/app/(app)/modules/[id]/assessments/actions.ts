"use server";

import { SCHOOL_GRADE_TYPE, validateSchoolGrade } from "@/lib/assessments/module-notes";
import { prepareMakeupInAdvance } from "@/app/(app)/modules/[id]/assessments/makeup-action";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ASSESSMENT_FILES_BUCKET, type AssessmentFile } from "@/lib/assessments/files";
import { examKindForType, kindOf } from "@/lib/assessments/individual";
import { makeupInvariants } from "@/lib/assessments/makeup";
import { parseScale, scaleToPoints } from "@/lib/assessments/score-scale";
import { readAssessmentForm } from "@/lib/assessments/schema";
import { parseResourceFiles, upsertFile } from "@/lib/resources/files";
import { createClient } from "@/lib/supabase/server";
import {
  individualValueFor,
  isAttendance,
  readMemberOverrides,
  type Attendance,
  type MemberOverride,
} from "@/lib/assessments/attendance";
import { parseCriterionComments, readFeedback } from "@/lib/assessments/feedback";
import { computeTotals, gradingProgress, readScores } from "@/lib/assessments/scoring";
import { mergeGradeContent, parseGradeBase, type GradeContent } from "@/lib/assessments/merge";
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

/**
 * Case « Jalon du projet fil rouge » : rattache l'évaluation au projet du module (ou l'en détache).
 * `null` : la case n'était pas dans le formulaire, rien ne change.
 */
async function milestoneColumns(
  supabase: Supabase,
  moduleId: string,
  formData: FormData,
  assessmentId: string | null,
) {
  if (formData.get("milestoneField") !== "1") return null;
  const { data: project } = await supabase
    .from("module_project")
    .select("id")
    .eq("module_id", moduleId)
    .maybeSingle();
  if (!project) return null;
  const on = formData.get("isMilestone") === "on";
  if (!on) {
    return assessmentId ? { project_id: null, project_role: null, project_position: null } : null;
  }
  if (assessmentId) {
    const { data: current } = await supabase
      .from("assessment")
      .select("project_id")
      .eq("id", assessmentId)
      .maybeSingle();
    if (current?.project_id === project.id) return null;
  }
  const { count } = await supabase
    .from("assessment")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project.id);
  return {
    project_id: project.id,
    project_role: "milestone" as const,
    project_position: (count ?? 0) + 1,
  };
}

/**
 * Oral : sans heure de début saisie, les créneaux partent de l'heure de la séance rattachée (jamais
 * de l'heure actuelle). Une heure déjà saisie n'est jamais écrasée.
 */
async function defaultOralStart(
  supabase: Supabase,
  assessmentId: string,
  type: string | null | undefined,
  courseId: string | null,
) {
  if (!courseId || kindOf(type) !== "oral") return;
  const { data: course } = await supabase
    .from("course")
    .select("start_time")
    .eq("id", courseId)
    .maybeSingle();
  if (!course?.start_time) return;
  await supabase
    .from("assessment")
    .update({ oral_start_time: course.start_time })
    .eq("id", assessmentId)
    .is("oral_start_time", null);
}

const subjectColumns = (d: {
  objective: string | null;
  deliverableMd: string | null;
  evaluatedMd: string | null;
  experienceNote: string | null;
  whereToSubmit: string | null;
  courseId: string | null;
  prepStatus: string;
}) => ({
  objective: d.objective,
  deliverable_md: d.deliverableMd,
  evaluated_md: d.evaluatedMd,
  experience_note: d.experienceNote,
  where_to_submit: d.whereToSubmit,
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

/** Barème de la note bonus de l'évaluation, ou `null` (pas un bonus, ou migration pas appliquée). */
async function readBonusScale(supabase: Supabase, assessmentId: string) {
  try {
    const { data, error } = await supabase
      .from("assessment")
      .select("is_bonus, score_scale")
      .eq("id", assessmentId)
      .maybeSingle();
    if (error || !data?.is_bonus) return null;
    return parseScale(data.score_scale);
  } catch {
    return null;
  }
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

  const milestone = await milestoneColumns(supabase, moduleId, formData, null);
  const { data, error } = await supabase
    .from("assessment")
    .insert({
      ...(milestone ?? {}),
      module_id: moduleId,
      title: parsed.data.title,
      subject: parsed.data.subject || null,
      type: parsed.data.type || null,
      exam_kind: examKindForType(parsed.data.type),
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

  await defaultOralStart(supabase, data.id, parsed.data.type, parsed.data.courseId);
  revalidatePath(`/modules/${moduleId}/assessments`);
  redirect(`/modules/${moduleId}/assessments/${data.id}?enregistre=1`);
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

  const milestone = await milestoneColumns(supabase, moduleId, formData, assessmentId);
  const { error } = await supabase
    .from("assessment")
    .update({
      ...(milestone ?? {}),
      title: parsed.data.title,
      subject: parsed.data.subject || null,
      type: parsed.data.type || null,
      exam_kind: examKindForType(parsed.data.type),
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

  await defaultOralStart(supabase, assessmentId, parsed.data.type, parsed.data.courseId);
  revalidatePath(`/modules/${moduleId}/assessments`);
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}`);
  redirect(`/modules/${moduleId}/assessments/${assessmentId}?enregistre=1`);
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
  /** Copie modifiée dans un autre onglet sur les mêmes champs : rien n'a été écrasé. */
  conflict?: boolean;
  /** Des champs ont changé ailleurs (autre onglet) : conservés ; recharger pour les voir. */
  elsewhere?: boolean;
  /** Nouvelle version de référence de l'onglet après enregistrement. */
  base?: GradeContent;
  /** Présences des membres après enregistrement (référence de l'onglet). */
  memberBase?: Record<string, { attendance: string; justification: string }>;
  /** Présence enregistrée (note individuelle), référence de l'onglet. */
  attendanceBase?: string;
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
  let attendance: Attendance =
    target.studentId && isAttendance(rawAttendance) ? rawAttendance : "present";
  const attendanceBase = formData.get("attendanceBase");

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

  const match = target.studentId
    ? { assessment_id: assessmentId, student_id: target.studentId }
    : { assessment_id: assessmentId, student_group_id: target.studentGroupId };
  const { data: existing } = await supabase.from("grade").select("*").match(match).maybeSingle();
  // Présence : inchangée dans cet onglet → on garde celle enregistrée (posée ailleurs, peut-être).
  if (
    target.studentId &&
    existing &&
    isAttendance(attendanceBase) &&
    attendance === attendanceBase &&
    isAttendance(existing.attendance)
  ) {
    attendance = existing.attendance;
  }

  // Deux onglets sur la même copie : seuls les champs modifiés dans CET onglet sont écrits.
  const base = parseGradeBase(formData.get("base"));
  let returnedBase: GradeContent | undefined;
  let elsewhere = false;
  let mergedScores: Record<string, number> | null = null;
  if (base && existing && criteria.length > 0) {
    const mine: GradeContent = {
      scores: readScores(formData.entries(), criteria),
      comments: text.criterionComments,
      strengths: text.strengths,
      progress: text.progress,
      feedback: text.feedback,
    };
    for (const id of assessment.auto_validated_criterion_ids) delete mine.scores[id];
    const current: GradeContent = {
      scores: Object.fromEntries(
        Object.entries((existing.scores ?? {}) as Record<string, unknown>).filter(
          (e): e is [string, number] => typeof e[1] === "number",
        ),
      ),
      comments: parseCriterionComments(existing.criterion_comments),
      strengths: existing.strengths,
      progress: existing.progress,
      feedback: existing.feedback,
    };
    const result = mergeGradeContent(base, mine, current);
    if (result.conflicts.length > 0) {
      return { error: "Cette copie a été modifiée dans un autre onglet.", conflict: true };
    }
    mergedScores = result.merged.scores;
    text.criterionComments = result.merged.comments;
    text.strengths = result.merged.strengths;
    text.progress = result.merged.progress;
    text.feedback = result.merged.feedback;
    elsewhere = result.changedElsewhere.length > 0;
    returnedBase = mergeGradeContent(base, mine, base).merged;
  } else if (criteria.length > 0) {
    returnedBase = {
      scores: readScores(formData.entries(), criteria),
      comments: text.criterionComments,
      strengths: text.strengths,
      progress: text.progress,
      feedback: text.feedback,
    };
    for (const id of assessment.auto_validated_criterion_ids) delete returnedBase.scores[id];
  }

  // Note bonus de certification : colonnes additives, lues à part (sans elles, rien ne change).
  const bonusBands = await readBonusScale(supabase, assessmentId);
  let rawScore: number | null | undefined;
  let value: number | null;
  let scores: Record<string, number> = {};
  if (criteria.length > 0) {
    // Total (bonus inclus) ramené au barème puis plafonné à ce barème (`computeTotals`).
    const autoValidatedIds = assessment.auto_validated_criterion_ids;
    scores = mergedScores ?? readScores(formData.entries(), criteria);
    for (const id of autoValidatedIds) delete scores[id];
    // Copie sans aucun critère noté, ou seulement en partie : pas de note (« en cours »), jamais un
    // faux 0 ni une note partielle dans les moyennes. Une absence posée a sa propre règle plus bas.
    value =
      gradingProgress(criteria, scores, autoValidatedIds).state === "complete"
        ? computeTotals(criteria, scores, { autoValidatedIds, maxScore: assessment.max_score })
            .value
        : null;
  } else if (attendance !== "present") {
    value = null;
  } else if (bonusBands) {
    // Note bonus : le serveur calcule la note sur 20 depuis le score saisi, d'après le barème.
    const rawField = formData.get("rawScore");
    const result = scaleToPoints(bonusBands, typeof rawField === "string" ? rawField : null);
    if (result.status === "error") return { error: result.message };
    rawScore = result.status === "ok" ? Number(String(rawField).replace(",", ".")) : null;
    value = result.status === "ok" ? result.points : null;
  } else {
    const raw = formData.get("value");
    const num = typeof raw === "string" && raw !== "" ? Number(raw.replace(",", ".")) : Number.NaN;
    // Champ vide : pas encore de note (par exemple une copie excusée remise en « Présent·e »).
    const empty = typeof raw !== "string" || raw.trim() === "";
    if (!empty && !Number.isFinite(num)) return { error: "Saisis une note valide." };
    const maxScore = assessment.max_score ?? 20;
    if (!empty && (num < 0 || num > maxScore)) {
      return { error: `La note doit être comprise entre 0 et ${maxScore}.` };
    }
    value = empty ? null : num;
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
    ...(rawScore !== undefined ? { raw_score: rawScore } : {}),
  };

  const saved = existing
    ? await supabase.from("grade").update(row).eq("id", existing.id).select("id").single()
    : await supabase.from("grade").insert(row).select("id").single();
  if (saved.error || !saved.data) return { error: failure("enregistrer") };

  let memberBaseOut: GradeFormState["memberBase"];
  if (memberOverrides && "overrides" in memberOverrides) {
    const gradeId = saved.data.id;
    // Deux onglets : seules les présences changées dans CET onglet sont écrites ; celles changées
    // ailleurs (autre onglet, écran de l'oral) sont gardées. Même valeur des deux côtés : pas de conflit.
    let memberBaseIn: Record<string, { attendance: string; justification: string }> | null = null;
    try {
      const raw = formData.get("memberBase");
      if (typeof raw === "string" && raw) memberBaseIn = JSON.parse(raw);
    } catch {
      memberBaseIn = null;
    }
    if (memberBaseIn) {
      const { data: currentRows } = await supabase
        .from("group_grade_member")
        .select("student_id, attendance, justification")
        .eq("grade_id", gradeId);
      const current = new Map(
        (currentRows ?? []).map((r) => [
          r.student_id,
          { attendance: r.attendance as string, justification: r.justification ?? "" },
        ]),
      );
      const ids = new Set([...Object.keys(memberBaseIn), ...memberOverrides.overrides.keys()]);
      const merged = new Map<string, MemberOverride>();
      const same = (a: { attendance: string; justification: string }, b: typeof a) =>
        a.attendance === b.attendance && (a.justification ?? "") === (b.justification ?? "");
      for (const sid of ids) {
        const def = { attendance: "present", justification: "" };
        const mineO = memberOverrides.overrides.get(sid);
        const mine = mineO
          ? { attendance: mineO.attendance as string, justification: mineO.justification ?? "" }
          : def;
        const base = memberBaseIn[sid] ?? def;
        const cur = current.get(sid) ?? def;
        let result = mine;
        if (same(mine, base)) result = cur;
        else if (!same(cur, base) && !same(cur, mine)) {
          return {
            error:
              "La présence d'un membre a été modifiée sur une autre page : recharge pour voir la version la plus récente avant de la changer ici.",
            conflict: true,
          };
        }
        if (!same(result, def))
          merged.set(sid, {
            attendance: result.attendance as MemberOverride["attendance"],
            factor: 1,
            justification: result.justification || null,
          });
      }
      memberOverrides = { overrides: merged };
    }
    memberBaseOut = Object.fromEntries(
      [...ids0(memberBaseIn, memberOverrides.overrides)].map((sid) => {
        const o =
          memberOverrides && "overrides" in memberOverrides
            ? memberOverrides.overrides.get(sid)
            : undefined;
        return [
          sid,
          { attendance: o?.attendance ?? "present", justification: o?.justification ?? "" },
        ];
      }),
    );
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
  return {
    saved: true,
    base: returnedBase,
    elsewhere,
    memberBase: memberBaseOut,
    attendanceBase: target.studentId ? attendance : undefined,
  };
}

/** Membres connus de l'onglet ou présents dans la saisie. */
function ids0(
  base: Record<string, unknown> | null,
  overrides: ReadonlyMap<string, unknown>,
): Set<string> {
  return new Set([...Object.keys(base ?? {}), ...overrides.keys()]);
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
