"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { readAssessmentForm } from "@/lib/assessments/schema";
import { createClient } from "@/lib/supabase/server";

export interface AssessmentFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function flatten(fieldErrors: Record<string, string[] | undefined>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(([, v]) => v && v.length) as [string, string[]][],
  );
}

export async function createAssessment(
  moduleId: string,
  _prev: AssessmentFormState,
  formData: FormData,
): Promise<AssessmentFormState> {
  const parsed = readAssessmentForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const supabase = await createClient();
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
      student_group_id: parsed.data.studentGroupId,
      grading_grid_id: parsed.data.gradingGridId,
      is_group_grade: parsed.data.isGroupGrade,
    })
    .select("id")
    .single();

  if (error || !data) return { error: "Enregistrement impossible." };

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

  const supabase = await createClient();
  const { error } = await supabase
    .from("assessment")
    .update({
      title: parsed.data.title,
      subject: parsed.data.subject || null,
      type: parsed.data.type || null,
      coefficient: parsed.data.coefficient,
      date: parsed.data.date,
      duration_minutes: parsed.data.durationMinutes,
      student_group_id: parsed.data.studentGroupId,
      grading_grid_id: parsed.data.gradingGridId,
      is_group_grade: parsed.data.isGroupGrade,
    })
    .eq("id", assessmentId);

  if (error) return { error: "Enregistrement impossible." };

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

function computeGradeFromForm(formData: FormData): {
  value: number | null;
  scores: Record<string, number>;
} {
  const scoreEntries = Array.from(formData.entries()).filter(([k]) => k.startsWith("score_"));
  if (scoreEntries.length > 0) {
    const scores: Record<string, number> = {};
    let total = 0;
    for (const [key, raw] of scoreEntries) {
      const num = Number(raw);
      if (Number.isNaN(num)) continue;
      const criterionId = key.slice("score_".length);
      scores[criterionId] = num;
      total += num;
    }
    return { value: total, scores };
  }
  const raw = formData.get("value");
  const num = typeof raw === "string" && raw !== "" ? Number(raw) : null;
  return { value: num !== null && !Number.isNaN(num) ? num : null, scores: {} };
}

async function saveGrade(
  moduleId: string,
  assessmentId: string,
  target: { studentId: string | null; studentGroupId: string | null },
  formData: FormData,
): Promise<GradeFormState> {
  const { value, scores } = computeGradeFromForm(formData);
  if (value === null) return { error: "Saisissez une note." };

  const feedback = String(formData.get("feedback") ?? "").trim();
  const predefinedCommentIds = formData.getAll("predefinedCommentIds").map(String);

  const supabase = await createClient();
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
    feedback: feedback || null,
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
