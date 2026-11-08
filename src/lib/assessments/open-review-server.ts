import "server-only";

import type { AnswerEntry } from "@/lib/assessments/open-review";
import type { OralCriterion } from "@/lib/assessments/oral-space";
import type { DrawnQuestion } from "@/lib/quiz/types";
import type { createClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/types/db";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface ReviewAttempt {
  id: string;
  studentId: string;
  name: string;
  status: Tables<"quiz_attempt">["status"];
  submittedAt: string | null;
  drawn: DrawnQuestion[];
  answers: Record<string, unknown>;
  manual: Record<string, unknown>;
  review: Tables<"open_review"> | null;
  gradeValue: number | null;
  /** Copie déjà corrigée par l'ancienne page (points saisis, aucune relecture ici). */
  legacyDone: boolean;
}

export interface OpenReviewContext {
  quiz: Tables<"quiz">;
  assessment: {
    id: string;
    module_id: string;
    title: string;
    max_score: number | null;
    auto_validated_criterion_ids: string[];
  };
  maxScore: number | null;
  criteria: OralCriterion[];
  /** question → critères rattachés. */
  links: Record<string, string[]>;
  attempts: ReviewAttempt[];
}

export const obj = (v: Json | undefined | null): Record<string, Json> =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, Json>) : {};

/** Réponses d'une relecture, avec les valeurs absentes ramenées à des entrées vides. */
export function readEntries(raw: Json | undefined | null): Record<string, AnswerEntry> {
  const out: Record<string, AnswerEntry> = {};
  for (const [pos, e] of Object.entries(obj(raw))) {
    const o = obj(e);
    const v = o.validated === undefined || o.validated === null ? null : obj(o.validated);
    out[pos] = {
      letter: typeof o.letter === "string" ? o.letter : "",
      points: typeof o.points === "number" ? o.points : null,
      comment: typeof o.comment === "string" ? o.comment : "",
      validated_at: typeof o.validated_at === "string" ? o.validated_at : null,
      validated: v
        ? {
            letter: typeof v.letter === "string" ? v.letter : "",
            points: typeof v.points === "number" ? v.points : null,
            comment: typeof v.comment === "string" ? v.comment : "",
          }
        : null,
    };
  }
  return out;
}

/** Charge tout l'écran de relecture. `null` si l'évaluation n'a pas de QCM ou pas de grille. */
export async function loadOpenReviewContext(
  supabase: Supabase,
  assessmentId: string,
): Promise<OpenReviewContext | null> {
  const { data: a } = await supabase
    .from("assessment")
    .select(
      "id, module_id, title, max_score, auto_validated_criterion_ids, grading_grid:grading_grid_id(grid_criterion(id, label, weight, axis_id, is_bonus, position, criterion_level(points, description)))",
    )
    .eq("id", assessmentId)
    .maybeSingle();
  if (!a) return null;
  const { data: quiz } = await supabase
    .from("quiz")
    .select("*")
    .eq("assessment_id", assessmentId)
    .maybeSingle();
  if (!quiz) return null;

  const raw = (
    a.grading_grid as unknown as {
      grid_criterion: {
        id: string;
        label: string;
        weight: number;
        axis_id: string | null;
        is_bonus: boolean;
        position: number;
        criterion_level: { points: number; description: string }[];
      }[];
    } | null
  )?.grid_criterion;
  const criteria: OralCriterion[] = [...(raw ?? [])]
    .sort((x, y) => x.position - y.position)
    .map((c) => ({
      id: c.id,
      label: c.label,
      weight: c.weight,
      axisId: c.axis_id,
      isBonus: c.is_bonus,
      levels: [...c.criterion_level].sort((x, y) => y.points - x.points),
    }));

  const [{ data: linkRows }, { data: attemptRows }, { data: gradeRows }] = await Promise.all([
    supabase
      .from("quiz_question_criterion")
      .select("question_id, criterion_id")
      .eq("quiz_id", quiz.id),
    supabase
      .from("quiz_attempt")
      .select(
        "id, student_id, status, submitted_at, drawn, answers, manual_scores, review_complete, student:student_id(first_name, last_name)",
      )
      .eq("quiz_id", quiz.id),
    supabase.from("grade").select("student_id, value").eq("assessment_id", assessmentId),
  ]);
  const attemptIds = (attemptRows ?? []).map((r) => r.id);
  const { data: reviewRows } = attemptIds.length
    ? await supabase.from("open_review").select("*").in("attempt_id", attemptIds)
    : { data: [] as Tables<"open_review">[] };

  const links: Record<string, string[]> = {};
  for (const l of linkRows ?? []) (links[l.question_id] ??= []).push(l.criterion_id);
  const reviewOf = new Map((reviewRows ?? []).map((r) => [r.attempt_id, r]));
  const gradeOf = new Map((gradeRows ?? []).map((g) => [g.student_id, g.value]));

  const attempts: ReviewAttempt[] = (attemptRows ?? [])
    .map((r) => {
      const s = r.student as unknown as { first_name: string; last_name: string } | null;
      const manual = obj(r.manual_scores);
      const review = reviewOf.get(r.id) ?? null;
      return {
        id: r.id,
        studentId: r.student_id,
        name: s ? `${s.first_name} ${s.last_name}` : "Étudiant·e",
        status: r.status,
        submittedAt: r.submitted_at,
        drawn: (r.drawn ?? []) as unknown as DrawnQuestion[],
        answers: obj(r.answers),
        manual,
        review,
        gradeValue: gradeOf.get(r.student_id) ?? null,
        legacyDone: !review && r.review_complete && (gradeOf.get(r.student_id) ?? null) !== null,
      } satisfies ReviewAttempt;
    })
    .sort((x, y) => x.name.localeCompare(y.name, "fr"));

  return {
    quiz,
    assessment: {
      id: a.id,
      module_id: a.module_id,
      title: a.title,
      max_score: a.max_score,
      auto_validated_criterion_ids: a.auto_validated_criterion_ids,
    },
    maxScore: a.max_score ?? 20,
    criteria,
    links,
    attempts,
  };
}
