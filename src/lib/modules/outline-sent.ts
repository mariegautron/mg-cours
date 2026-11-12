/**
 * « Progression envoyée » : UNE seule définition pour toute l'appli (Prochaine étape, Où j'en suis,
 * facture, tableau de bord, page Progression). Le diagnostic du schéma (12 nov. 2026) a montré
 * trois sources selon l'âge du module :
 *   - la progression générée dans l'appli, marquée envoyée / validée (`pedagogical_outline`) ;
 *   - le PDF de la progression déposé dans les documents (`module_document` « outline_sent ») ;
 *   - l'ancienne case « Progression pédagogique » des documents administratifs (`admin_docs`).
 * Une seule suffit. L'état iceberg n'en fait PAS partie : cocher « Facture envoyée » le fait
 * avancer au-delà de « Progression envoyée » sans que la progression soit partie.
 */
export interface OutlineSentSources {
  outline?: { status?: string | null; sent_at?: string | null } | null;
  documents?: readonly { kind: string }[] | null;
  adminDocs?: unknown;
}

export function isOutlineSent({ outline, documents, adminDocs }: OutlineSentSources): boolean {
  if (outline?.status === "sent" || outline?.status === "validated" || !!outline?.sent_at) {
    return true;
  }
  if ((documents ?? []).some((d) => d.kind === "outline_sent")) return true;
  return (
    typeof adminDocs === "object" &&
    adminDocs !== null &&
    (adminDocs as Record<string, unknown>).progression_pedagogique === true
  );
}
