/**
 * « Terminer le module » (maquette ModFin) : liste de vérification avant de ranger un module.
 * Rien n'est bloquant : chaque ligne dit seulement ce qu'il reste. Fonction pure.
 */
export interface FinishInput {
  courses: { completion: string | null }[];
  notes: { entered: number; required: number };
  adminDocs: Record<string, boolean>;
  invoiceSent: boolean;
  invoicePaid: boolean;
}

export interface FinishItem {
  key: "sessions" | "notes" | "invoice" | "documents";
  label: string;
  detail: string;
  done: boolean;
}

export function finishChecklist(i: FinishInput): FinishItem[] {
  const total = i.courses.length;
  const held = i.courses.filter(
    (c) => c.completion === "done" || c.completion === "partial",
  ).length;
  const hyper = !!i.adminDocs.notes_hyperplanning;
  const supports = !!i.adminDocs.supports_moodle && !!i.adminDocs.sujets_grilles_moodle;
  return [
    {
      key: "sessions",
      label: "Toutes les séances sont faites",
      detail: `${held} séance${held > 1 ? "s" : ""} sur ${total}`,
      done: total > 0 && held >= total,
    },
    {
      key: "notes",
      label: "Notes saisies dans l’appli et dans Hyperplanning",
      detail: `${i.notes.entered} note${i.notes.entered > 1 ? "s" : ""} sur ${i.notes.required}${hyper ? "" : " · Hyperplanning à cocher"}`,
      done: i.notes.required > 0 && i.notes.entered >= i.notes.required && hyper,
    },
    {
      key: "invoice",
      label: "Facture envoyée et payée",
      detail: i.invoicePaid
        ? "Facture payée"
        : i.invoiceSent
          ? "Case « payée » à cocher"
          : "Facture à déposer, envoyer puis cocher « payée »",
      done: i.invoicePaid,
    },
    {
      key: "documents",
      label: "Documents à jour sur Moodle",
      detail: "Supports, sujets, grilles",
      done: supports,
    },
  ];
}
