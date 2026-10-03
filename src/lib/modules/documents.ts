export const DOCUMENT_KINDS = [
  "school_expectations",
  "outline_sent",
  "slides",
  "external_invoice",
  "training_agreement",
] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export interface AgreementDoc {
  id: string;
  name: string;
  label: string | null;
  signed_on: string | null;
  created_at: string;
}

/** Libellé affiché d'une convention : le libellé libre, sinon le nom du fichier. */
export function agreementTitle(d: Pick<AgreementDoc, "label" | "name">): string {
  return d.label?.trim() || d.name;
}

/** Ordre d'affichage : date de signature (les sans-date à la fin), puis date de dépôt. */
export function sortAgreements<T extends AgreementDoc>(docs: T[]): T[] {
  return [...docs].sort((a, b) => {
    if (a.signed_on && b.signed_on && a.signed_on !== b.signed_on) {
      return a.signed_on < b.signed_on ? -1 : 1;
    }
    if (!!a.signed_on !== !!b.signed_on) return a.signed_on ? -1 : 1;
    return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
  });
}

/** « Convention déposée » : au moins un fichier de ce type. Jamais bloquant pour la facturation. */
export function agreementDeposited(docs: { kind: string }[]): boolean {
  return docs.some((d) => d.kind === "training_agreement");
}
