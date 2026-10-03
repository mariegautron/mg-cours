import { listQuestions } from "@/lib/questions/queries";
import type { QuestionType } from "@/lib/questions/types";
import { createClient } from "@/lib/supabase/server";
import type { BankQuestion, DrawRule } from "@/lib/quiz/types";
import type { Tables } from "@/types/db";

export type QuizRow = Tables<"quiz">;

export interface QuizWithRules extends QuizRow {
  rules: DrawRule[];
}

export async function getQuizByAssessment(assessmentId: string): Promise<QuizWithRules | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quiz")
    .select("*, quiz_draw_rule(*)")
    .eq("assessment_id", assessmentId)
    .maybeSingle();
  if (!data) return null;
  const { quiz_draw_rule, ...quiz } = data;
  return {
    ...quiz,
    rules: [...quiz_draw_rule]
      .sort((a, b) => a.position - b.position)
      .map((r) => ({
        category: r.category,
        tags: r.tags,
        types: r.types as QuestionType[],
        count: r.count,
        pointsEach: Number(r.points_each),
      })),
  };
}

/** Réserve de questions d'un QCM (US-157) ; table absente ou réserve vide → `null` (toute la banque). */
export async function getQuizPool(quizId: string): Promise<Set<string> | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("quiz_pool")
      .select("question_id")
      .eq("quiz_id", quizId);
    if (error || !data || data.length === 0) return null;
    return new Set(data.map((r) => r.question_id));
  } catch {
    return null;
  }
}

/** Banque active, dans la forme attendue par le tirage ; limitée à la réserve du QCM s'il en a une. */
export async function loadBank(quizId?: string): Promise<BankQuestion[]> {
  const pool = quizId ? await getQuizPool(quizId) : null;
  return (await listQuestions())
    .filter((q) => !q.archived_at && (!pool || pool.has(q.id)))
    .map((q) => ({
      id: q.id,
      category: q.category,
      name: q.name,
      type: q.type as QuestionType,
      statement: q.statement,
      generalFeedback: q.general_feedback,
      tags: q.tags,
      numericValue: q.numeric_value === null ? null : Number(q.numeric_value),
      numericTolerance: q.numeric_tolerance === null ? null : Number(q.numeric_tolerance),
      choices: q.choices.map((c) => ({
        text: c.text,
        fraction: Number(c.fraction),
        feedback: c.feedback,
      })),
    }));
}

export interface AttemptSummary {
  id: string;
  studentId: string;
  name: string;
  email: string | null;
  status: "ready" | "in_progress" | "submitted";
  revoked: boolean;
  sentAt: string | null;
  usedAt: string | null;
  startedAt: string | null;
  deadlineAt: string | null;
  submittedAt: string | null;
  submittedLate: boolean;
  hasLateAnswers: boolean;
  timeMultiplier: number;
  questionCount: number;
  reusedCount: number;
  totalPoints: number;
  autoScore: number | null;
  score: number | null;
  reviewComplete: boolean;
}

/** Tentatives d'un QCM, sans le tirage ni les réponses (allégé pour la liste de suivi). */
export async function listAttempts(quizId: string): Promise<AttemptSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quiz_attempt")
    .select(
      "id, student_id, status, revoked_at, sent_at, used_at, started_at, deadline_at, submitted_at, submitted_late, late_answers, time_multiplier, question_count, reused_count, total_points, auto_score, score, review_complete, student:student_id(first_name, last_name, email)",
    )
    .eq("quiz_id", quizId);
  return (data ?? [])
    .map((a) => {
      const s = a.student as unknown as {
        first_name: string;
        last_name: string;
        email: string | null;
      } | null;
      return {
        id: a.id,
        studentId: a.student_id,
        name: s ? `${s.first_name} ${s.last_name}` : "Étudiant·e",
        email: s?.email ?? null,
        status: a.status,
        revoked: a.revoked_at !== null,
        sentAt: a.sent_at,
        usedAt: a.used_at,
        startedAt: a.started_at,
        deadlineAt: a.deadline_at,
        submittedAt: a.submitted_at,
        submittedLate: a.submitted_late,
        hasLateAnswers: a.late_answers !== null,
        timeMultiplier: Number(a.time_multiplier),
        questionCount: a.question_count,
        reusedCount: a.reused_count,
        totalPoints: Number(a.total_points),
        autoScore: a.auto_score === null ? null : Number(a.auto_score),
        score: a.score === null ? null : Number(a.score),
        reviewComplete: a.review_complete,
      } satisfies AttemptSummary;
    })
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/**
 * Étudiant·es qui peuvent recevoir un lien : celles et ceux du QCM qui ne sont pas déclaré·es absent·es
 * (une absence excusée se rattrape par un QCM de rattrapage ; une absence non prévenue vaut 0).
 */
export async function passingStudents<S extends { id: string }>(
  assessmentId: string,
  students: readonly S[],
): Promise<{ eligible: S[]; absent: number }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("grade")
    .select("student_id, attendance")
    .eq("assessment_id", assessmentId);
  const absent = new Set(
    (data ?? []).filter((g) => g.attendance !== "present" && g.student_id).map((g) => g.student_id),
  );
  return {
    eligible: students.filter((s) => !absent.has(s.id)),
    absent: students.filter((s) => absent.has(s.id)).length,
  };
}
