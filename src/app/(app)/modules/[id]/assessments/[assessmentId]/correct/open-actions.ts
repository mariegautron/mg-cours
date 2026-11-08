"use server";

import { revalidatePath } from "next/cache";

import {
  clampPoints,
  criterionCommentTexts,
  criterionScores,
  planCopyWrite,
  type AnswerEntry,
  type WrittenReview,
  EMPTY_ENTRY,
} from "@/lib/assessments/open-review";
import { loadOpenReviewContext, obj, readEntries } from "@/lib/assessments/open-review-server";
import { isLetter } from "@/lib/assessments/oral-space";
import { saveVersionedField, type SaveFieldResult } from "@/lib/assessments/versioned-save";
import { regradeAttempt } from "@/lib/quiz/grade-server";
import type { DrawnQuestion } from "@/lib/quiz/types";
import { failure, NOT_FOUND } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/types/db";

export type { SaveFieldResult };

type Review = Tables<"open_review">;
type Supabase = Awaited<ReturnType<typeof createClient>>;

const LOCKED = "Cette copie est verrouillée : clique sur « Rouvrir la copie » pour la modifier.";

function refresh(moduleId: string, assessmentId: string) {
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}/correct`);
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}`);
  revalidatePath(`/modules/${moduleId}/assessments`);
  revalidatePath(`/modules/${moduleId}`);
}

/** Relecture d'une copie ; la crée au besoin. Une copie déjà corrigée par l'ancienne page arrive verrouillée, points repris. */
async function ensureReview(supabase: Supabase, attemptId: string): Promise<Review | null> {
  const { data: existing } = await supabase
    .from("open_review")
    .select("*")
    .eq("attempt_id", attemptId)
    .maybeSingle();
  if (existing) return existing;
  const { data: attempt } = await supabase
    .from("quiz_attempt")
    .select("student_id, manual_scores, review_complete, drawn, quiz:quiz_id(assessment_id)")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) return null;
  const assessmentId = (attempt.quiz as unknown as { assessment_id: string }).assessment_id;
  const { data: grade } = await supabase
    .from("grade")
    .select("value")
    .eq("assessment_id", assessmentId)
    .eq("student_id", attempt.student_id)
    .maybeSingle();
  const legacy = attempt.review_complete && grade?.value !== null && grade?.value !== undefined;
  const manual = obj(attempt.manual_scores);
  const now = new Date().toISOString();
  const questions: Record<string, Json> = {};
  if (legacy) {
    for (const [pos, p] of Object.entries(manual)) {
      if (typeof p !== "number") continue;
      questions[pos] = {
        letter: "",
        points: p,
        comment: "",
        validated_at: now,
        validated: { letter: "", points: p, comment: "" },
      };
    }
  }
  const { data: created } = await supabase
    .from("open_review")
    .upsert(
      { attempt_id: attemptId, questions, locked: !!legacy },
      { onConflict: "attempt_id", ignoreDuplicates: true },
    )
    .select("*")
    .maybeSingle();
  if (created) return created;
  const { data: again } = await supabase
    .from("open_review")
    .select("*")
    .eq("attempt_id", attemptId)
    .maybeSingle();
  return again ?? null;
}

const pointsText = (p: number | null) => (p === null ? "" : String(p));

/** Enregistre UN champ de la relecture, avec sa version (jamais d'écrasement d'une saisie plus récente). */
export async function saveReviewField(
  moduleId: string,
  assessmentId: string,
  attemptId: string,
  field: string,
  value: string,
  baseVersion: number,
  force = false,
): Promise<SaveFieldResult> {
  const supabase = await createClient();
  const { data: attempt } = await supabase
    .from("quiz_attempt")
    .select("drawn")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) return { ok: false, error: NOT_FOUND.assessment };
  const drawn = (attempt.drawn ?? []) as unknown as DrawnQuestion[];
  const [kind, pos, part] = field.split(":");

  return saveVersionedField<Review>({
    supabase,
    table: "open_review",
    load: () => ensureReview(supabase, attemptId),
    field,
    value,
    baseVersion,
    force,
    guard: (row) => (row.locked ? LOCKED : null),
    readField: (row) => {
      if (kind === "global") return row.global_comment;
      if (kind === "crit") {
        const v = obj(row.criterion_letters)[pos];
        return typeof v === "string" ? v : "";
      }
      const entry = readEntries(row.questions)[pos];
      if (!entry) return "";
      return part === "points"
        ? pointsText(entry.points)
        : part === "letter"
          ? entry.letter
          : entry.comment;
    },
    patchFor: (row) => {
      if (kind === "global") return { global_comment: value.slice(0, 20000) };
      if (kind === "crit") {
        if (value !== "" && !isLetter(value)) return { error: "Lettre inconnue." };
        const next = { ...obj(row.criterion_letters) };
        if (value === "") delete next[pos];
        else next[pos] = value;
        return { criterion_letters: next };
      }
      if (kind !== "q" || !/^\d{1,3}$/.test(pos)) return { error: "Champ inconnu." };
      const question = drawn[Number(pos) - 1];
      if (!question) return { error: "Question inconnue." };
      const entries = readEntries(row.questions);
      const entry: AnswerEntry = { ...(entries[pos] ?? EMPTY_ENTRY) };
      if (part === "letter") {
        if (value !== "" && !isLetter(value)) return { error: "Lettre inconnue." };
        entry.letter = value;
      } else if (part === "points") {
        if (value.trim() === "") entry.points = null;
        else {
          const n = Number(value.replace(",", "."));
          if (!Number.isFinite(n) || n < 0)
            return { error: "Les points doivent être un nombre positif ou nul." };
          entry.points = clampPoints(n, question.points);
        }
      } else if (part === "comment") entry.comment = value.slice(0, 5000);
      else return { error: "Champ inconnu." };
      return { questions: { ...obj(row.questions), [pos]: entry as unknown as Json } };
    },
  });
}

export interface ReviewActionState {
  error?: string;
  ok?: boolean;
}

/** Valide une réponse : un palier et des points sont requis. Toute modification ultérieure la repasse « modifiée ». */
export async function validateAnswer(
  moduleId: string,
  assessmentId: string,
  attemptId: string,
  position: number,
): Promise<ReviewActionState> {
  const supabase = await createClient();
  const review = await ensureReview(supabase, attemptId);
  if (!review) return { error: NOT_FOUND.assessment };
  if (review.locked) return { error: LOCKED };
  const entries = readEntries(review.questions);
  const entry = entries[String(position)];
  if (!entry || !isLetter(entry.letter))
    return { error: "Choisis un palier (A à D) avant de valider." };
  if (entry.points === null) return { error: "Indique les points avant de valider." };
  const validated_at = new Date().toISOString();
  const next = {
    ...obj(review.questions),
    [String(position)]: {
      ...entry,
      validated_at,
      validated: { letter: entry.letter, points: entry.points, comment: entry.comment },
    } as unknown as Json,
  };
  const { error } = await supabase
    .from("open_review")
    .update({ questions: next })
    .eq("id", review.id);
  if (error) return { error: failure("valider la réponse") };
  return { ok: true };
}

/**
 * Rouvre une copie écrite : elle redevient modifiable et « en cours » (hors moyennes). L'étudiant·e
 * garde la note publiée jusqu'au prochain « Mettre à jour ». L'ancienne valeur est gardée en historique.
 */
export async function reopenCopy(
  moduleId: string,
  assessmentId: string,
  attemptId: string,
): Promise<ReviewActionState> {
  const supabase = await createClient();
  const review = await ensureReview(supabase, attemptId);
  if (!review) return { error: NOT_FOUND.assessment };
  const { data: attempt } = await supabase
    .from("quiz_attempt")
    .select("student_id, score")
    .eq("id", attemptId)
    .maybeSingle();
  if (!attempt) return { error: NOT_FOUND.assessment };
  const { data: grade } = await supabase
    .from("grade")
    .select("id, value")
    .eq("assessment_id", assessmentId)
    .eq("student_id", attempt.student_id)
    .maybeSingle();
  const history = Array.isArray(review.history) ? review.history : [];
  const { error } = await supabase
    .from("open_review")
    .update({
      locked: false,
      history: [
        ...history,
        {
          at: new Date().toISOString(),
          value: grade?.value ?? null,
          letters: review.criterion_letters,
          written_at: review.written_at,
        },
      ] as unknown as Json,
    })
    .eq("id", review.id);
  if (error) return { error: failure("rouvrir la copie") };
  // « En cours » : la note sort des moyennes, la note publiée ne bouge pas.
  if (grade) await supabase.from("grade").update({ value: null }).eq("id", grade.id);
  refresh(moduleId, assessmentId);
  return { ok: true };
}

export interface WriteResult {
  error?: string;
  written?: string[];
  skipped?: { attemptId: string; reasons: string[] }[];
}

/**
 * « Enregistrer dans l'évaluation » : écrit les copies prêtes (toutes les réponses validées, toutes
 * les questions rattachées, une lettre par critère). Les autres restent « en cours » et ne sont pas
 * touchées. Tout ou rien : si une écriture échoue, tout ce qui a été écrit est remis comme avant.
 */
export async function writeReviews(
  moduleId: string,
  assessmentId: string,
  attemptIds: string[],
): Promise<WriteResult> {
  const supabase = await createClient();
  const ctx = await loadOpenReviewContext(supabase, assessmentId);
  if (!ctx) return { error: NOT_FOUND.assessment };
  if (ctx.quiz.correction_mode !== "open_questions")
    return { error: "Cette évaluation n’est pas en correction « questions ouvertes »." };

  const maxScore = ctx.maxScore ?? 20;
  const ready: {
    attempt: (typeof ctx.attempts)[number];
    review: Review;
    plan: ReturnType<typeof planCopyWrite>;
  }[] = [];
  const skipped: { attemptId: string; reasons: string[] }[] = [];
  for (const id of attemptIds) {
    const attempt = ctx.attempts.find((a) => a.id === id);
    if (!attempt) continue;
    const review = await ensureReview(supabase, id);
    if (!review) continue;
    if (review.locked) {
      skipped.push({ attemptId: id, reasons: ["Déjà écrite et verrouillée."] });
      continue;
    }
    const plan = planCopyWrite({
      drawn: attempt.drawn.map((q, i) => ({
        position: i + 1,
        questionId: q.question_id,
        points: q.points,
      })),
      entries: readEntries(review.questions),
      criteria: ctx.criteria,
      links: ctx.links,
      criterionLetters: Object.fromEntries(
        Object.entries(obj(review.criterion_letters)).filter(
          (e): e is [string, string] => typeof e[1] === "string",
        ),
      ),
      maxScore,
    });
    if (plan.blockers.length > 0) skipped.push({ attemptId: id, reasons: plan.blockers });
    else ready.push({ attempt, review, plan });
  }
  if (ready.length === 0) return { written: [], skipped };

  // État précédent de chaque copie, pour tout remettre en cas d'échec.
  const before = await Promise.all(
    ready.map(async ({ attempt }) => {
      const [{ data: att }, { data: grade }] = await Promise.all([
        supabase
          .from("quiz_attempt")
          .select("manual_scores, score, auto_score, review_complete, result")
          .eq("id", attempt.id)
          .maybeSingle(),
        supabase
          .from("grade")
          .select("*")
          .eq("assessment_id", assessmentId)
          .eq("student_id", attempt.studentId)
          .maybeSingle(),
      ]);
      return { attemptId: attempt.id, att, grade };
    }),
  );
  const rollback = async () => {
    for (const b of before) {
      if (b.att)
        await supabase
          .from("quiz_attempt")
          .update({
            manual_scores: b.att.manual_scores,
            score: b.att.score,
            auto_score: b.att.auto_score,
            review_complete: b.att.review_complete,
            result: b.att.result,
          })
          .eq("id", b.attemptId);
      const done = ready.find((r) => r.attempt.id === b.attemptId);
      if (b.grade)
        await supabase
          .from("grade")
          .update({
            value: b.grade.value,
            scores: b.grade.scores,
            criterion_comments: b.grade.criterion_comments,
            feedback: b.grade.feedback,
          })
          .eq("id", b.grade.id);
      else if (done)
        await supabase
          .from("grade")
          .delete()
          .eq("assessment_id", assessmentId)
          .eq("student_id", done.attempt.studentId);
      if (done)
        await supabase
          .from("open_review")
          .update({
            locked: done.review.locked,
            written: done.review.written,
            written_at: done.review.written_at,
          })
          .eq("id", done.review.id);
    }
  };
  const fail = async () => {
    await rollback();
    return { error: `Rien n’a été écrit. ${failure("enregistrer dans l’évaluation")}` };
  };

  const written: string[] = [];
  for (const { attempt, review, plan } of ready) {
    const manual: Record<string, number> = {};
    for (const line of plan.perCriterion)
      for (const q of line.questions) manual[String(q.position)] = q.points;
    // Points des questions : l'appli recalcule score et « relecture terminée » comme partout.
    const { error: manualError } = await supabase
      .from("quiz_attempt")
      .update({ manual_scores: manual })
      .eq("id", attempt.id);
    if (manualError) return await fail();
    const regraded = await regradeAttempt(supabase, attempt.id);
    if (regraded.error) return await fail();

    // La note = somme des points ramenée au barème ; les paliers et commentaires vont à la grille.
    const comments = criterionCommentTexts(plan);
    const { data: grade } = await supabase
      .from("grade")
      .select("id")
      .eq("assessment_id", assessmentId)
      .eq("student_id", attempt.studentId)
      .maybeSingle();
    const patch = {
      value: plan.value,
      scores: criterionScores(plan, ctx.criteria),
      criterion_comments: comments,
      feedback: review.global_comment.trim() === "" ? null : review.global_comment,
      attendance: "present" as const,
    };
    const saved = grade
      ? await supabase.from("grade").update(patch).eq("id", grade.id)
      : await supabase
          .from("grade")
          .insert({ assessment_id: assessmentId, student_id: attempt.studentId, ...patch });
    if (saved.error) return await fail();

    const snapshot: WrittenReview = {
      value: plan.value,
      total: plan.total,
      total_max: plan.totalMax,
      global_comment: review.global_comment,
      criteria: plan.perCriterion.map((line) => ({
        criterion_id: line.criterionId,
        label: line.label,
        letter: line.letter,
        questions: line.questions.map((q) => ({
          position: q.position,
          // L'énoncé seulement : jamais l'attendu (`general_feedback`) ni une note privée.
          statement: attempt.drawn[q.position - 1]?.statement ?? "",
          points: q.points,
          max: q.max,
          comment: q.comment,
        })),
      })),
    };
    const { error: reviewError } = await supabase
      .from("open_review")
      .update({
        locked: true,
        written: snapshot as unknown as Json,
        written_at: new Date().toISOString(),
      })
      .eq("id", review.id);
    if (reviewError) return await fail();
    written.push(attempt.id);
  }
  refresh(moduleId, assessmentId);
  return { written, skipped };
}

/** Choix explicite de Marie : corriger cette évaluation en « questions ouvertes ». Les notes existantes ne bougent pas. */
export async function setCorrectionMode(
  moduleId: string,
  assessmentId: string,
  mode: "classic" | "open_questions",
): Promise<ReviewActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("quiz")
    .update({ correction_mode: mode })
    .eq("assessment_id", assessmentId);
  if (error) return { error: failure("changer le mode de correction") };
  refresh(moduleId, assessmentId);
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}/quiz`);
  return { ok: true };
}

/** Critère(s) de la grille auquel(s) une question se rattache. */
export async function setQuestionCriteria(
  moduleId: string,
  assessmentId: string,
  questionId: string,
  criterionIds: string[],
): Promise<ReviewActionState> {
  const supabase = await createClient();
  const { data: quiz } = await supabase
    .from("quiz")
    .select("id")
    .eq("assessment_id", assessmentId)
    .maybeSingle();
  if (!quiz) return { error: NOT_FOUND.assessment };
  const { error: clearError } = await supabase
    .from("quiz_question_criterion")
    .delete()
    .eq("quiz_id", quiz.id)
    .eq("question_id", questionId);
  if (clearError) return { error: failure("enregistrer le rattachement") };
  if (criterionIds.length > 0) {
    const { error } = await supabase
      .from("quiz_question_criterion")
      .insert(
        criterionIds.map((criterion_id) => ({
          quiz_id: quiz.id,
          question_id: questionId,
          criterion_id,
        })),
      );
    if (error) return { error: failure("enregistrer le rattachement") };
  }
  refresh(moduleId, assessmentId);
  return { ok: true };
}
