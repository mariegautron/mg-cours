/**
 * Sujet d'une évaluation tel qu'il est fourni aux étudiant·es (US-90) : objectif, consigne, rendu
 * attendu, ce qui sera évalué. Fonctions pures : rien de ce qui touche à Marie (notes, carnet,
 * commentaires) n'y figure.
 */

export type PrepStatus = "to_build" | "ready" | "provided";

export const PREP_STATUS_LABELS: Record<PrepStatus, string> = {
  to_build: "À construire",
  ready: "Prête",
  provided: "Fournie",
};

export const PREP_STATUSES = Object.keys(PREP_STATUS_LABELS) as PrepStatus[];

export function isPrepStatus(value: unknown): value is PrepStatus {
  return typeof value === "string" && (PREP_STATUSES as string[]).includes(value);
}

/** Un sujet « à construire » ne se projette pas et ne s'exporte pas. */
export function canPresent(status: PrepStatus): boolean {
  return status !== "to_build";
}

export interface SubjectSection {
  key: "objective" | "instructions" | "deliverable" | "evaluated";
  heading: string;
  /** Texte brut (objectif) ou Markdown (les autres). */
  text: string;
  markdown: boolean;
}

export interface SubjectInput {
  objective: string | null;
  /** Consigne (`assessment.subject`). */
  subject: string | null;
  deliverable_md: string | null;
  evaluated_md: string | null;
}

/** Sections non vides du sujet, dans l'ordre de lecture. */
export function subjectSections(input: SubjectInput): SubjectSection[] {
  const sections: SubjectSection[] = [
    { key: "objective", heading: "Objectif", text: input.objective ?? "", markdown: false },
    { key: "instructions", heading: "Consigne", text: input.subject ?? "", markdown: true },
    {
      key: "deliverable",
      heading: "Rendu attendu",
      text: input.deliverable_md ?? "",
      markdown: true,
    },
    {
      key: "evaluated",
      heading: "Ce qui sera évalué",
      text: input.evaluated_md ?? "",
      markdown: true,
    },
  ];
  return sections.filter((s) => s.text.trim() !== "");
}

/**
 * Critères de la grille annoncés aux étudiant·es : libellé, barème, bonus. Ni notes, ni
 * commentaires : uniquement ce que la grille remise (US-91) montre aussi.
 */
export function evaluatedCriteria(
  criteria: readonly { label: string; weight: number; is_bonus?: boolean; position?: number }[],
): { label: string; points: number; bonus: boolean }[] {
  return [...criteria]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((c) => ({ label: c.label, points: c.weight, bonus: c.is_bonus ?? false }));
}
