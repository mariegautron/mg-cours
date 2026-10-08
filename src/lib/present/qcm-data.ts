import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  buildQcmGroups,
  type QcmChoice,
  type QcmGroup,
  type QcmQuestion,
  type QcmQuestionType,
} from "@/lib/present/qcm";

/**
 * Mini-QCM d'une séance : questions liées aux ressources projetées, regroupées par fiche.
 * Tolérant : table absente ou erreur → aucun mini-QCM, le déroulé reste projetable.
 * Lecture seule : rien n'est jamais modifié ici.
 */
export async function loadCourseQcm(
  resources: readonly { id: string; title: string }[],
  limit: number | null,
  hidden: ReadonlySet<string>,
): Promise<QcmGroup[]> {
  if (resources.length === 0) return [];
  try {
    const supabase = await createClient();
    const { data: links, error } = await supabase
      .from("resource_question")
      .select("resource_id, question_id")
      .in(
        "resource_id",
        resources.map((r) => r.id),
      )
      .order("created_at")
      .order("id");
    if (error || !links?.length) return [];

    const questionIds = [...new Set(links.map((l) => l.question_id))];
    const [questionsRes, choicesRes] = await Promise.all([
      supabase
        .from("question")
        .select(
          "id, name, type, statement, general_feedback, category, archived_at, numeric_value, numeric_tolerance",
        )
        .in("id", questionIds)
        .is("archived_at", null),
      supabase
        .from("question_choice")
        .select("id, question_id, position, text, is_correct, fraction, feedback")
        .in("question_id", questionIds)
        .order("position")
        .order("created_at"),
    ]);
    if (questionsRes.error || choicesRes.error) return [];

    const choicesBy = new Map<string, QcmChoice[]>();
    for (const c of choicesRes.data ?? []) {
      const list = choicesBy.get(c.question_id) ?? [];
      list.push({
        id: c.id,
        position: c.position,
        text: c.text,
        isCorrect: c.is_correct,
        fraction: Number(c.fraction),
        feedback: c.feedback,
      });
      choicesBy.set(c.question_id, list);
    }
    const questions = new Map<string, QcmQuestion>(
      (questionsRes.data ?? []).map((q) => [
        q.id,
        {
          id: q.id,
          name: q.name,
          type: q.type as QcmQuestionType,
          statement: q.statement,
          generalFeedback: q.general_feedback,
          category: q.category,
          archived: q.archived_at !== null,
          numericValue: q.numeric_value === null ? null : Number(q.numeric_value),
          numericTolerance: q.numeric_tolerance === null ? null : Number(q.numeric_tolerance),
          choices: choicesBy.get(q.id) ?? [],
        },
      ]),
    );
    return buildQcmGroups({
      resources,
      links: links.map((l) => ({ resourceId: l.resource_id, questionId: l.question_id })),
      questions,
      limit,
      hidden,
    });
  } catch {
    return [];
  }
}

/**
 * Pour « Avant de commencer » : combien de questions projetables par fiche (sans limite), afin
 * d'afficher « 12 questions » et de proposer de passer une fiche.
 */
export async function countCourseQcm(
  resources: readonly { id: string; title: string }[],
): Promise<Map<string, number>> {
  const groups = await loadCourseQcm(resources, null, new Set());
  return new Map(groups.map((g) => [g.resourceId, g.available]));
}
