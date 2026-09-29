"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { readAssessmentForm } from "@/lib/assessments/schema";
import { createClient } from "@/lib/supabase/server";
import { readFeedback } from "@/lib/assessments/feedback";
import { computeTotals, readScores } from "@/lib/assessments/scoring";

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
  await supabase.from("assessment").delete().eq("id", assessmentId);
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

  let value: number;
  let scores: Record<string, number> = {};
  if (criteria.length > 0) {
    // Total (bonus inclus) ramené au barème puis plafonné à ce barème (`computeTotals`).
    const autoValidatedIds = assessment.auto_validated_criterion_ids;
    scores = readScores(formData.entries(), criteria);
    for (const id of autoValidatedIds) delete scores[id];
    value = computeTotals(criteria, scores, {
      autoValidatedIds,
      maxScore: assessment.max_score,
    }).value;
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
    scores,
    feedback: text.feedback,
    strengths: text.strengths,
    progress: text.progress,
    criterion_comments: text.criterionComments,
    predefined_comment_ids: predefinedCommentIds,
  };

  const { error } = existing
    ? await supabase.from("grade").update(row).eq("id", existing.id)
    : await supabase.from("grade").insert(row);

  if (error) return { error: "Enregistrement impossible." };

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
