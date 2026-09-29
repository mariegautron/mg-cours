import type { ChoiceInput, QuestionInput } from "@/lib/questions/types";

const round4 = (n: number) => Math.round(n * 10000) / 10000;

export const TRUE_FALSE_LABELS = ["Vrai", "Faux"] as const;

/**
 * Répartit les points d'un choix multiple : chaque bonne réponse vaut 1/N (N = nombre de bonnes
 * réponses), une mauvaise 0 — sauf si une fraction est déjà fournie (import Moodle, points négatifs).
 * `correct` : cases cochées dans le formulaire.
 */
export function fractionsFromChecks(correct: readonly boolean[]): number[] {
  const n = correct.filter(Boolean).length;
  return correct.map((c) => (c && n > 0 ? round4(1 / n) : 0));
}

/** Normalise les choix d'une question selon son type (vrai / faux : toujours Vrai puis Faux). */
export function normalizeChoices(input: QuestionInput): ChoiceInput[] {
  if (input.type === "open" || input.type === "numerical") return [];
  if (input.type === "true_false") {
    const trueIsCorrect = input.choices[0]?.fraction > 0;
    return TRUE_FALSE_LABELS.map((text, i) => ({
      text,
      fraction: (i === 0) === trueIsCorrect ? 1 : 0,
      feedback: input.choices[i]?.feedback ?? "",
    }));
  }
  return input.choices.map((c) => ({ ...c, text: c.text.trim() }));
}

/** Erreurs (en français, tutoiement) qui empêchent d'enregistrer la question ; vide si valide. */
export function validateQuestion(input: QuestionInput): string[] {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push("Donne un nom court à la question (ex. SCRUM03_Roles).");
  if (!input.statement.trim()) errors.push("L’énoncé est vide : écris la question posée.");
  if (!Number.isFinite(input.defaultPoints) || input.defaultPoints < 0)
    errors.push("Les points par défaut doivent être un nombre positif ou nul.");

  const choices = normalizeChoices(input);
  const correct = choices.filter((c) => c.fraction > 0);
  switch (input.type) {
    case "single_choice":
    case "multiple_choice":
      if (choices.length < 2) errors.push("Ajoute au moins deux choix.");
      if (choices.some((c) => !c.text))
        errors.push("Un choix est vide : remplis-le ou supprime-le.");
      if (input.type === "single_choice" && correct.length !== 1)
        errors.push("Un choix unique a exactement une bonne réponse : coche-la.");
      if (input.type === "multiple_choice" && correct.length < 1)
        errors.push("Coche au moins une bonne réponse.");
      break;
    case "true_false":
      if (correct.length !== 1) errors.push("Indique si l’affirmation est vraie ou fausse.");
      break;
    case "numerical":
      if (input.numericValue === null || !Number.isFinite(input.numericValue))
        errors.push("Donne la valeur attendue (un nombre).");
      if (
        input.numericTolerance !== null &&
        (!Number.isFinite(input.numericTolerance) || input.numericTolerance < 0)
      )
        errors.push("La tolérance est un nombre positif ou nul.");
      break;
    case "open":
      break;
  }
  return errors;
}

/** Tags saisis « a, b ;c » → liste distincte, sans vides, sans casse dupliquée. */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw.split(/[,;\n]/)) {
    const tag = t.trim();
    const key = tag.toLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      out.push(tag);
    }
  }
  return out;
}
