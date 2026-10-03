"use server";

import { revalidatePath } from "next/cache";

import { getAssessment } from "@/lib/assessments/queries";
import { failure } from "@/lib/messages";
import { rulesForPool, type PickedQuestion } from "@/lib/quiz/generate";
import { getQuizByAssessment } from "@/lib/quiz/queries";
import type { QuestionType } from "@/lib/questions/types";
import { createClient } from "@/lib/supabase/server";

export interface GenerateState {
  error?: string;
  done?: boolean;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Crée (ou met à jour, tant qu'il est en brouillon) le QCM d'une évaluation individuelle à partir
 * de questions choisies : réserve = ces questions, règles = une par type.
 */
export async function generateQuiz(
  moduleId: string,
  assessmentId: string,
  questionIds: string[],
): Promise<GenerateState> {
  const ids = [...new Set(questionIds.filter((q) => UUID.test(q)))];
  if (ids.length === 0) return { error: "Choisis au moins une question." };
  if (ids.length > 200) return { error: "200 questions au plus." };

  const assessment = await getAssessment(assessmentId);
  if (!assessment || assessment.module_id !== moduleId)
    return { error: "Cette évaluation n’existe plus." };
  if (assessment.is_group_grade) {
    return {
      error: "Un QCM est une évaluation individuelle : cette évaluation est notée par groupe.",
    };
  }
  const supabase = await createClient();
  const probe = await supabase.from("quiz_pool").select("id").limit(1);
  if (probe.error)
    return { error: "La génération sera disponible après la mise à jour de la base de données." };

  const { data: questions } = await supabase
    .from("question")
    .select("id, type, default_points, archived_at")
    .in("id", ids);
  const usable = (questions ?? []).filter((q) => !q.archived_at);
  if (usable.length !== ids.length)
    return { error: "Une des questions n’existe plus ou est archivée." };

  let quiz = await getQuizByAssessment(assessmentId);
  if (quiz && quiz.status !== "draft") {
    return {
      error: "Ce QCM est déjà publié : repasse-le en brouillon pour changer ses questions.",
    };
  }
  if (!quiz) {
    const { error } = await supabase
      .from("quiz")
      .insert({ assessment_id: assessmentId, title: assessment.title });
    if (error) return { error: failure("créer le QCM") };
    if (!assessment.type)
      await supabase.from("assessment").update({ type: "QCM" }).eq("id", assessmentId);
    quiz = await getQuizByAssessment(assessmentId);
    if (!quiz) return { error: failure("créer le QCM") };
  }
  const { count: attempts } = await supabase
    .from("quiz_attempt")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quiz.id);
  if (attempts)
    return {
      error: "Des copies sont déjà préparées : supprime-les avant de changer les questions.",
    };

  const picked: PickedQuestion[] = usable.map((q) => ({
    id: q.id,
    type: q.type as QuestionType,
    defaultPoints: Number(q.default_points),
  }));
  const rules = rulesForPool(picked);

  await supabase.from("quiz_pool").delete().eq("quiz_id", quiz.id);
  const { error: poolError } = await supabase
    .from("quiz_pool")
    .insert(ids.map((question_id) => ({ quiz_id: quiz!.id, question_id })));
  if (poolError) return { error: failure("enregistrer les questions") };

  await supabase.from("quiz_draw_rule").delete().eq("quiz_id", quiz.id);
  const { error: ruleError } = await supabase.from("quiz_draw_rule").insert(
    rules.map((r, position) => ({
      quiz_id: quiz!.id,
      position,
      category: r.category,
      tags: r.tags,
      types: r.types,
      count: r.count,
      points_each: r.pointsEach,
    })),
  );
  if (ruleError) return { error: failure("enregistrer les règles du QCM") };

  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}/quiz`);
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}`);
  return { done: true };
}
