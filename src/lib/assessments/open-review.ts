/**
 * Relecture des questions ouvertes tirées au sort (« Étude de cas »). Fonctions pures.
 *
 * Réutilise les briques de l'oral : paliers en lettres (`oral-space`), version par champ
 * (`decideFieldSave`). Une réponse est « à valider », « validée » ou « modifiée après ta validation ».
 * La décision de Marie et toute proposition sont deux données séparées : rien ici ne lit une proposition.
 */
import { isLetter, levelFor, type Letter, type OralCriterion } from "@/lib/assessments/oral-space";

export interface AnswerEntry {
  letter: string;
  points: number | null;
  comment: string;
  validated_at: string | null;
  /** Ce qui a été validé : sert à repérer une modification ultérieure. */
  validated: { letter: string; points: number | null; comment: string } | null;
}

export const EMPTY_ENTRY: AnswerEntry = {
  letter: "",
  points: null,
  comment: "",
  validated_at: null,
  validated: null,
};

export type AnswerState = "pending" | "validated" | "modified";

export const ANSWER_STATE_LABELS: Record<AnswerState, string> = {
  pending: "À valider",
  validated: "Validée",
  modified: "Modifiée après ta validation",
};

export function answerState(entry: AnswerEntry | undefined): AnswerState {
  if (!entry || !entry.validated_at || !entry.validated) return "pending";
  const v = entry.validated;
  return v.letter === entry.letter && v.points === entry.points && v.comment === entry.comment
    ? "validated"
    : "modified";
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Les points ne dépassent jamais le barème de la question, ni ne descendent sous 0. */
export function clampPoints(points: number, max: number): number {
  if (!Number.isFinite(points)) return 0;
  return round2(Math.min(Math.max(points, 0), max));
}

/**
 * Points pré-remplis pour un palier : la part du barème de la question que représente le palier dans
 * le critère rattaché (palier / barème du critère). Sans rattachement, A = tout, D = rien.
 */
export function prefillPoints(
  letter: string,
  max: number,
  criteria: readonly OralCriterion[],
): number | null {
  if (!isLetter(letter)) return null;
  const linked = criteria.find((c) => levelFor(c, letter) && c.weight > 0);
  const level = linked ? levelFor(linked, letter) : null;
  if (linked && level) return clampPoints((level.points / linked.weight) * max, max);
  const fallback: Record<Letter, number> = { A: 1, B: 2 / 3, C: 1 / 3, D: 0 };
  return clampPoints(fallback[letter] * max, max);
}

/** Lettre confirmée d'un critère, pré-choisie seulement si tous les paliers de ses questions sont identiques. */
export function suggestedCriterionLetter(letters: readonly string[]): Letter | null {
  const set = new Set(letters);
  if (set.size !== 1) return null;
  const [only] = [...set];
  return isLetter(only) ? only : null;
}

export interface DrawnLite {
  position: number;
  questionId: string;
  points: number;
}

export interface CopyProgress {
  validated: number;
  total: number;
  complete: boolean;
}

/** Réponses validées sur le total de la copie (une réponse modifiée après validation compte comme à revalider). */
export function copyProgress(
  drawn: readonly DrawnLite[],
  entries: Readonly<Record<string, AnswerEntry | undefined>>,
): CopyProgress {
  const validated = drawn.filter(
    (q) => answerState(entries[String(q.position)]) === "validated",
  ).length;
  return {
    validated,
    total: drawn.length,
    complete: drawn.length > 0 && validated === drawn.length,
  };
}

export interface WriteLine {
  criterionId: string;
  label: string;
  letter: string;
  questions: { position: number; points: number; max: number; comment: string }[];
}

export interface CopyWritePlan {
  /** Total des points de questions, et note ramenée au barème de l'évaluation. */
  total: number;
  totalMax: number;
  value: number;
  perCriterion: WriteLine[];
  /** Ce qui empêche d'écrire cette copie (vide : prête). */
  blockers: string[];
  /** Réponses laissées de côté (non validées). */
  notWritten: number[];
}

/**
 * Plan d'écriture d'une copie : points par question, note = somme ramenée sur le barème, lettre
 * confirmée par critère (rangée avec ses questions). Les réponses non validées ne sont pas écrites.
 */
export function planCopyWrite(input: {
  drawn: readonly DrawnLite[];
  entries: Readonly<Record<string, AnswerEntry | undefined>>;
  criteria: readonly OralCriterion[];
  /** question → critères auxquels elle se rattache. */
  links: Readonly<Record<string, readonly string[]>>;
  criterionLetters: Readonly<Record<string, string | undefined>>;
  maxScore: number;
}): CopyWritePlan {
  const { drawn, entries, criteria, links, criterionLetters, maxScore } = input;
  const blockers: string[] = [];
  const notWritten = drawn
    .filter((q) => answerState(entries[String(q.position)]) !== "validated")
    .map((q) => q.position);
  if (notWritten.length > 0) {
    blockers.push(`Réponses à valider : ${notWritten.join(", ")}.`);
  }
  const totalMax = round2(drawn.reduce((s, q) => s + q.points, 0));
  let total = 0;
  for (const q of drawn) {
    const e = entries[String(q.position)];
    if (answerState(e) === "validated" && e?.points != null)
      total += clampPoints(e.points, q.points);
  }
  total = round2(total);
  const value = totalMax > 0 ? round2(Math.min((total / totalMax) * maxScore, maxScore)) : 0;

  const unlinked = drawn.filter((q) => (links[q.questionId] ?? []).length === 0);
  if (unlinked.length > 0) {
    blockers.push(
      `Question${unlinked.length > 1 ? "s" : ""} non rattachée${unlinked.length > 1 ? "s" : ""} à un critère : ${unlinked.map((q) => q.position).join(", ")}.`,
    );
  }

  const perCriterion: WriteLine[] = [];
  for (const c of criteria) {
    const qs = drawn.filter((q) => (links[q.questionId] ?? []).includes(c.id));
    if (qs.length === 0) continue;
    const letter = criterionLetters[c.id] ?? "";
    if (!isLetter(letter)) blockers.push(`Lettre à confirmer pour le critère « ${c.label} ».`);
    perCriterion.push({
      criterionId: c.id,
      label: c.label,
      letter,
      questions: qs.map((q) => {
        const e = entries[String(q.position)];
        return {
          position: q.position,
          points: e?.points == null ? 0 : clampPoints(e.points, q.points),
          max: q.points,
          comment: e?.comment ?? "",
        };
      }),
    });
  }
  return { total, totalMax, value, perCriterion, blockers, notWritten };
}

/** Points par critère (palier confirmé) pour la grille, depuis le plan. */
export function criterionScores(
  plan: CopyWritePlan,
  criteria: readonly OralCriterion[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of plan.perCriterion) {
    const c = criteria.find((x) => x.id === line.criterionId);
    if (!c || !isLetter(line.letter)) continue;
    const level = levelFor(c, line.letter);
    if (level) out[c.id] = level.points;
  }
  return out;
}

/** Commentaires rangés par critère, un texte par critère pour la grille (les questions sans mot sont ignorées). */
export function criterionCommentTexts(plan: CopyWritePlan): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of plan.perCriterion) {
    const parts = line.questions
      .filter((q) => q.comment.trim() !== "")
      .map((q) =>
        line.questions.length > 1
          ? `Question ${q.position} : ${q.comment.trim()}`
          : q.comment.trim(),
      );
    if (parts.length > 0) out[line.criterionId] = parts.join("\n\n");
  }
  return out;
}

/** Photo gardée avec la copie écrite ; destinée à l'étudiant·e (jamais l'attendu, jamais les notes privées). */
export interface WrittenReview {
  value: number;
  total: number;
  total_max: number;
  global_comment: string;
  criteria: {
    criterion_id: string;
    label: string;
    letter: string;
    questions: {
      position: number;
      statement: string;
      points: number;
      max: number;
      comment: string;
    }[];
  }[];
}

export function parseWrittenReview(raw: unknown): WrittenReview | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const w = raw as Record<string, unknown>;
  if (typeof w.value !== "number" || !Array.isArray(w.criteria)) return null;
  return w as unknown as WrittenReview;
}

/** Ordre de la copie suivante (alphabétique), `null` à la fin. */
export function nextInOrder<T extends { id: string }>(
  items: readonly T[],
  currentId: string,
): T | null {
  const i = items.findIndex((x) => x.id === currentId);
  return i === -1 ? null : (items[i + 1] ?? null);
}
