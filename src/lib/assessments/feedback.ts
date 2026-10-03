/** Longueur maximale d'un commentaire (critère, points forts, progrès, libre). */
export const FEEDBACK_MAX_LENGTH = 4000;

export interface FeedbackFields {
  /** Commentaire par critère : `{ criterion_id: texte }` (les critères sans commentaire sont omis). */
  criterionComments: Record<string, string>;
  strengths: string | null;
  progress: string | null;
  /** Commentaire libre. */
  feedback: string | null;
}

function clean(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string") return null;
  return raw.trim().slice(0, FEEDBACK_MAX_LENGTH) || null;
}

/**
 * Lit le commentaire structuré d'un formulaire de note : `comment_<critère>` (seuls les critères de la
 * grille sont retenus), `comment_axis:<axe>` (axes de la grille), `strengths`, `progress` et `feedback` (commentaire libre).
 */
export function readFeedback(
  formData: FormData,
  criterionIds: readonly string[],
  axisIds: readonly string[] = [],
): FeedbackFields {
  const criterionComments: Record<string, string> = {};
  for (const id of criterionIds) {
    const text = clean(formData.get(`comment_${id}`));
    if (text) criterionComments[id] = text;
  }
  // Attendus cochés (US-143) : `checks_<critère>` = positions « 0,2 », rangées sous `checks:<critère>`.
  for (const id of criterionIds) {
    const raw = formData.get(`checks_${id}`);
    if (typeof raw === "string" && /^\d+(,\d+)*$/.test(raw.trim()) && raw.length <= 200) {
      criterionComments[`checks:${id}`] = raw.trim();
    }
  }
  // Commentaire d'axe (vue compacte, US-140) : rangé sous `axis:<axe>` dans les mêmes commentaires.
  for (const id of axisIds) {
    const text = clean(formData.get(`comment_axis:${id}`));
    if (text) criterionComments[`axis:${id}`] = text;
  }
  return {
    criterionComments,
    strengths: clean(formData.get("strengths")),
    progress: clean(formData.get("progress")),
    feedback: clean(formData.get("feedback")),
  };
}

/** Relit `grade.criterion_comments` (jsonb) sans faire confiance à sa forme. */
export function parseCriterionComments(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim() !== "",
    ),
  );
}
