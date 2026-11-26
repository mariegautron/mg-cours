/** Publication des appréciations dans les espaces : fonctions pures. */
import { hasHole } from "./appreciation";

export interface PublishableRow {
  student_id: string;
  text: string;
  is_proposal: boolean;
  published_text: string | null;
}

/** Publiable : texte écrit et relu (ni brouillon proposé, ni passage « à compléter »). */
export function isPublishable(row: Pick<PublishableRow, "text" | "is_proposal">): boolean {
  return row.text.trim() !== "" && !row.is_proposal && !hasHole(row.text);
}

export interface PublicationSummary {
  /** Personnes dont une appréciation est visible dans leur espace. */
  published: number;
  /** Publiables dont l'espace n'affiche pas (ou plus) le texte actuel. */
  pending: string[];
}

export function publicationSummary(rows: readonly PublishableRow[]): PublicationSummary {
  return {
    published: rows.filter((r) => r.published_text !== null).length,
    pending: rows
      .filter((r) => isPublishable(r) && r.published_text !== r.text)
      .map((r) => r.student_id),
  };
}
