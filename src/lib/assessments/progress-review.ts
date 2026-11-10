/**
 * Point d'étape : un rendu commenté SANS note. Fonctions pures : repères par critère, gabarits
 * « Proposer », état d'un retour, ce qui manque avant « Terminer le retour ».
 *
 * Un point d'étape n'a jamais de ligne `grade` : il n'entre ni dans les moyennes, ni dans les notes
 * exigées par l'école, ni dans l'export Hyperplanning.
 */
import { kindOf } from "@/lib/assessments/individual";

export const REVIEW_MARKS = ["ahead", "on_track", "review"] as const;
export type ReviewMark = (typeof REVIEW_MARKS)[number];

export const REVIEW_MARK_LABELS: Record<ReviewMark, string> = {
  ahead: "En avance",
  on_track: "Sur la bonne voie",
  review: "À revoir",
};

/** Touche de chaque repère (A, V, R). Les flèches n'enregistrent rien. */
export const REVIEW_MARK_KEYS: Record<string, ReviewMark> = {
  A: "ahead",
  V: "on_track",
  R: "review",
};

export function isReviewMark(v: unknown): v is ReviewMark {
  return typeof v === "string" && (REVIEW_MARKS as readonly string[]).includes(v);
}

/** Type proposé dans « Ajouter une évaluation ». */
export const PROGRESS_REVIEW_TYPE = "Point d’étape";

/** Une évaluation est un point d'étape d'après son type (« Point d'étape … »). */
export function isProgressReview(a: { type?: string | null } | null | undefined): boolean {
  return !!a && kindOf(a.type) === "checkpoint";
}

/**
 * Point d'étape NON noté : hors moyennes, hors notes exigées, pas de note. Un point d'étape « Noté »
 * est une évaluation notée comme les autres (ses repères et retours en plus).
 */
export function isUngradedReview(
  a: { type?: string | null; review_graded?: boolean | null } | null | undefined,
): boolean {
  return isProgressReview(a) && !a?.review_graded;
}

/** Critères de la grille repris par le point d'étape (`null` : toute la grille). */
export function reviewCriteria<T extends { id: string; is_bonus?: boolean | null }>(
  criteria: readonly T[],
  selected: readonly string[] | null | undefined,
): T[] {
  const scored = criteria.filter((c) => !c.is_bonus);
  if (!selected || selected.length === 0) return scored;
  const keep = new Set(selected);
  return scored.filter((c) => keep.has(c.id));
}

const lowerFirst = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/**
 * « Proposer » : phrase de départ selon le repère. Vouvoie un groupe, tutoie une personne. Ne lit
 * jamais les notes privées.
 */
export function proposeComment(mark: ReviewMark, criterionLabel: string, isGroup: boolean): string {
  const label = lowerFirst(criterionLabel.trim());
  switch (mark) {
    case "ahead":
      return isGroup ? `Vous êtes en avance sur ${label}.` : `Tu es en avance sur ${label}.`;
    case "on_track":
      return isGroup
        ? `Vous êtes sur la bonne voie sur ${label}.`
        : `Tu es sur la bonne voie sur ${label}.`;
    case "review":
      return `Point à revoir avant la suite : ${label}.`;
  }
}

/** Commentaire global proposé d'après les repères posés. */
export function proposeGlobal(
  marks: Readonly<Record<string, string | undefined>>,
  criteria: readonly { id: string; label: string }[],
  isGroup: boolean,
): string {
  const by = (m: ReviewMark) =>
    criteria.filter((c) => marks[c.id] === m).map((c) => lowerFirst(c.label));
  const ahead = by("ahead");
  const onTrack = by("on_track");
  const review = by("review");
  const parts: string[] = [];
  const you = isGroup ? "Vous êtes" : "Tu es";
  if (ahead.length) parts.push(`${you} en avance sur ${ahead.join(", ")}.`);
  if (onTrack.length) parts.push(`${you} sur la bonne voie sur ${onTrack.join(", ")}.`);
  if (review.length) parts.push(`Points à revoir avant la suite : ${review.join(", ")}.`);
  return parts.join(" ");
}

export type ReviewState = "to_comment" | "in_progress" | "done" | "published";

export const REVIEW_STATE_LABELS: Record<ReviewState, string> = {
  to_comment: "À commenter",
  in_progress: "En cours",
  done: "Retour terminé",
  published: "Publié",
};

export interface ReviewRowLike {
  state: string;
  marks: unknown;
  comments: unknown;
  global_comment: string;
  published_at: string | null;
  done_at: string | null;
}

const asMap = (v: unknown): Record<string, string> =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, string>) : {};

/** État d'un retour : à commenter (rien), en cours, terminé, publié (version à jour publiée). */
export function reviewState(row: ReviewRowLike | null | undefined): ReviewState {
  if (!row) return "to_comment";
  const touched =
    Object.values(asMap(row.marks)).some(Boolean) ||
    Object.values(asMap(row.comments)).some((t) => t.trim()) ||
    row.global_comment.trim() !== "";
  if (row.state !== "done") return touched ? "in_progress" : "to_comment";
  if (row.published_at && (!row.done_at || row.published_at >= row.done_at)) return "published";
  return "done";
}

/** Ce qui manque au récapitulatif de « Terminer le retour » (jamais bloquant). */
export function reviewGaps(
  criteria: readonly { id: string; label: string }[],
  marks: Readonly<Record<string, string | undefined>>,
  comments: Readonly<Record<string, string | undefined>>,
  globalComment: string,
): string[] {
  const gaps: string[] = [];
  const noMark = criteria.filter((c) => !isReviewMark(marks[c.id]));
  if (noMark.length) gaps.push(`Sans repère : ${noMark.map((c) => c.label).join(", ")}.`);
  const noComment = criteria.filter((c) => !(comments[c.id] ?? "").trim());
  if (noComment.length)
    gaps.push(`Sans commentaire : ${noComment.map((c) => c.label).join(", ")}.`);
  if (!globalComment.trim()) gaps.push("Pas de commentaire global.");
  return gaps;
}

/** « À revoir (12/10) → Sur la bonne voie (09/11) » : historique d'un critère. */
export function markHistory(
  entries: readonly { date: string | null; mark: string | undefined }[],
): string {
  return entries
    .filter((e): e is { date: string | null; mark: ReviewMark } => isReviewMark(e.mark))
    .map(
      (e) =>
        `${REVIEW_MARK_LABELS[e.mark]}${
          e.date
            ? ` (${new Date(e.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })})`
            : ""
        }`,
    )
    .join(" → ");
}
