import { z } from "zod";

/** Phrase réutilisable (forme minimale de `predefined_comment`). */
export interface Phrase {
  id: string;
  text: string;
  category: "positive" | "negative" | "advice";
  grid_criterion_id: string | null;
  criterion_label: string | null;
  subject: string | null;
  use_count: number;
  last_used_at: string | null;
  created_at: string;
}

export const phraseInputSchema = z.object({
  text: z.string().trim().min(1, "Le texte est obligatoire.").max(1000, "1 000 caractères max."),
  criterionId: z.string().uuid().nullable(),
  subject: z
    .string()
    .trim()
    .max(100, "Matière trop longue.")
    .transform((v) => v || null),
  category: z.enum(["positive", "negative", "advice"]).default("advice"),
});

export type PhraseInput = z.input<typeof phraseInputSchema>;

/** Filtre de critère : toutes les phrases, celles sans critère, ou celles d'un critère. */
export type CriterionFilter =
  { kind: "all" } | { kind: "general" } | { kind: "criterion"; id: string; label: string };

const norm = (s: string | null | undefined) => (s ?? "").trim().toLocaleLowerCase("fr");

/**
 * Une phrase appartient à un critère par son identifiant, ou par le même libellé (la grille a pu être
 * dupliquée ou recréée d'une année à l'autre : la phrase reste alors utile).
 */
export function matchesCriterion(
  phrase: Pick<Phrase, "grid_criterion_id" | "criterion_label">,
  criterion: { id: string; label: string },
): boolean {
  if (phrase.grid_criterion_id === criterion.id) return true;
  return (
    norm(phrase.criterion_label) !== "" && norm(phrase.criterion_label) === norm(criterion.label)
  );
}

export function filterPhrases<T extends Pick<Phrase, "grid_criterion_id" | "criterion_label">>(
  phrases: readonly T[],
  filter: CriterionFilter,
): T[] {
  if (filter.kind === "all") return [...phrases];
  if (filter.kind === "general") {
    return phrases.filter((p) => !p.grid_criterion_id && !norm(p.criterion_label));
  }
  return phrases.filter((p) => matchesCriterion(p, filter));
}

/**
 * Ordre de proposition : les plus utilisées d'abord ; à usage égal, celles de la même matière ; puis
 * la plus récemment utilisée, puis la plus récemment créée.
 */
export function rankPhrases<
  T extends Pick<Phrase, "use_count" | "subject" | "last_used_at" | "created_at">,
>(phrases: readonly T[], subject: string | null): T[] {
  const wanted = norm(subject);
  const sameSubject = (p: T) => (wanted !== "" && norm(p.subject) === wanted ? 1 : 0);
  return [...phrases].sort(
    (a, b) =>
      b.use_count - a.use_count ||
      sameSubject(b) - sameSubject(a) ||
      (b.last_used_at ?? "").localeCompare(a.last_used_at ?? "") ||
      b.created_at.localeCompare(a.created_at),
  );
}

/** Texte à enregistrer : la sélection si elle existe, sinon tout le commentaire. */
export function selectedOrAll(value: string, start: number, end: number): string {
  const selection = value.slice(Math.min(start, end), Math.max(start, end)).trim();
  return selection || value.trim();
}

/**
 * Insère une phrase dans un commentaire, au curseur (`cursor`) ou à la fin (`cursor` nul, sur une
 * nouvelle ligne). Le texte autour est conservé ; une espace est ajoutée seulement si nécessaire.
 * Renvoie le nouveau texte et la position du curseur juste après la phrase.
 */
export function insertPhrase(
  value: string,
  text: string,
  cursor: number | null,
): { value: string; cursor: number } {
  if (cursor === null || cursor >= value.length) {
    const base = value.trimEnd();
    const next = base ? `${base}\n${text}` : text;
    return { value: next, cursor: next.length };
  }
  const at = Math.max(0, cursor);
  const before = value.slice(0, at);
  const after = value.slice(at);
  const lead = before === "" || /\s$/.test(before) ? "" : " ";
  const trail = /^\s/.test(after) ? "" : " ";
  const inserted = `${lead}${text}${trail}`;
  return {
    value: before + inserted + after,
    cursor: before.length + inserted.length - (trail ? 1 : 0),
  };
}
