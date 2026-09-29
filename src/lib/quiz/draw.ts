import { rngFromSeed, shuffled } from "@/lib/quiz/rng";
import type { BankQuestion, DrawnQuestion, DrawRule } from "@/lib/quiz/types";

export interface DrawOptions {
  rules: readonly DrawRule[];
  bank: readonly BankQuestion[];
  seed: string;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  /** Questions déjà vues par l'étudiant·e (rattrapage) : évitées tant que la banque le permet. */
  seen?: ReadonlySet<string>;
}

export interface DrawResult {
  questions: DrawnQuestion[];
  totalPoints: number;
  /** Nombre de questions tirées qui avaient déjà été vues. */
  reused: number;
}

export class DrawError extends Error {}

/** Total de points identique pour tou·tes : somme de `count × points_each` de chaque règle. */
export function quizTotalPoints(rules: readonly Pick<DrawRule, "count" | "pointsEach">[]): number {
  return Math.round(rules.reduce((s, r) => s + r.count * r.pointsEach, 0) * 100) / 100;
}

export function matchesRule(q: BankQuestion, rule: DrawRule): boolean {
  if (rule.category && q.category !== rule.category) return false;
  if (rule.types.length && !rule.types.includes(q.type)) return false;
  const tags = new Set(q.tags.map((t) => t.toLowerCase()));
  return rule.tags.every((t) => tags.has(t.toLowerCase()));
}

/** Combien de questions de la banque répondent à chaque règle (avant tout tirage). */
export function availablePerRule(bank: readonly BankQuestion[], rules: readonly DrawRule[]) {
  return rules.map((r) => bank.filter((q) => matchesRule(q, r)).length);
}

/** Règles que la banque ne peut pas honorer (même en reprenant des questions déjà vues). */
export function shortages(bank: readonly BankQuestion[], rules: readonly DrawRule[]): string[] {
  return availablePerRule(bank, rules).flatMap((available, i) =>
    available < rules[i].count
      ? [
          `Règle ${i + 1} : il faut ${rules[i].count} question${rules[i].count > 1 ? "s" : ""}, la banque n’en a que ${available} qui ${available > 1 ? "correspondent" : "correspond"}.`,
        ]
      : [],
  );
}

function toDrawn(q: BankQuestion, points: number, shuffleChoices: boolean, rng: () => number) {
  const keepOrder = q.type === "true_false";
  return {
    question_id: q.id,
    type: q.type,
    statement: q.statement,
    points,
    general_feedback: q.generalFeedback,
    numeric_value: q.numericValue,
    numeric_tolerance: q.numericTolerance,
    choices: (shuffleChoices && !keepOrder ? shuffled(q.choices, rng) : q.choices).map((c) => ({
      text: c.text,
      fraction: c.fraction,
      feedback: c.feedback,
    })),
  } satisfies DrawnQuestion;
}

/**
 * Tirage individuel : un ensemble de questions par étudiant·e, figé (le tirage se rejoue à l'identique
 * avec la même graine). Une question ne sort qu'une fois dans une même copie. Les questions déjà vues
 * (`seen`) ne sont reprises que si la banque n'en offre pas assez d'autres.
 */
export function drawQuiz(opts: DrawOptions): DrawResult {
  const problems = shortages(opts.bank, opts.rules);
  if (problems.length) throw new DrawError(problems.join(" "));

  const rng = rngFromSeed(opts.seed);
  const used = new Set<string>();
  const drawn: DrawnQuestion[] = [];
  let reused = 0;
  const seen = opts.seen ?? new Set<string>();

  for (const [i, rule] of opts.rules.entries()) {
    const candidates = opts.bank.filter((q) => matchesRule(q, rule) && !used.has(q.id));
    const fresh = shuffled(
      candidates.filter((q) => !seen.has(q.id)),
      rng,
    );
    const old = shuffled(
      candidates.filter((q) => seen.has(q.id)),
      rng,
    );
    const picked = [...fresh, ...old].slice(0, rule.count);
    if (picked.length < rule.count) {
      // Les règles précédentes ont épuisé les questions communes : dit clairement laquelle manque.
      throw new DrawError(
        `Règle ${i + 1} : il ne reste que ${picked.length} question${picked.length > 1 ? "s" : ""} sur ${rule.count} une fois les autres règles servies.`,
      );
    }
    for (const q of picked) {
      used.add(q.id);
      if (seen.has(q.id)) reused += 1;
      drawn.push(toDrawn(q, rule.pointsEach, opts.shuffleChoices, rng));
    }
  }

  return {
    questions: opts.shuffleQuestions ? shuffled(drawn, rng) : drawn,
    totalPoints: quizTotalPoints(opts.rules),
    reused,
  };
}

/** Phrase à montrer à Marie : « 2 sur 10 déjà vues ». `null` si rien à signaler. */
export function reuseNotice(reused: number, total: number): string | null {
  return reused > 0 ? `${reused} sur ${total} déjà vue${reused > 1 ? "s" : ""}` : null;
}
