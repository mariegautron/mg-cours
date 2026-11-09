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
  /** Au moins une convention de formation déposée (facultatif : absent = non déposée). */
  agreementDeposited?: boolean;
  /** Appréciations écrites / à écrire (ce que Marie oublie le plus). */
  appreciations?: { written: number; total: number };
  /** Avis des étudiant·es : réponses reçues, `null` si le questionnaire n'est pas encore envoyé. */
  feedbackResponses?: number | null;
  /** Adresses des lignes (chaque ligne mène quelque part). */
  hrefs?: Partial<Record<FinishItem["key"], string>>;
}

export interface FinishItem {
  key: "sessions" | "notes" | "appreciations" | "documents" | "invoice" | "agreement" | "feedback";
  label: string;
  detail: string;
  done: boolean;
  /** Où aller pour faire ce qui reste. */
  href?: string;
  /** Ligne d'information, jamais « à faire ». */
  optional?: boolean;
}

export function finishChecklist(i: FinishInput): FinishItem[] {
  const total = i.courses.length;
  const held = i.courses.filter(
    (c) => c.completion === "done" || c.completion === "partial",
  ).length;
  const hyper = !!i.adminDocs.notes_hyperplanning;
  const supports = !!i.adminDocs.supports_moodle && !!i.adminDocs.sujets_grilles_moodle;
  const apps = i.appreciations;
  const items: FinishItem[] = [
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
    ...(apps
      ? [
          {
            key: "appreciations" as const,
            label: "Appréciations écrites",
            detail: `${apps.written} sur ${apps.total}`,
            done: apps.total > 0 && apps.written >= apps.total,
          },
        ]
      : []),
    {
      key: "documents",
      label: "Documents à jour sur Moodle",
      detail: "Supports, sujets, grilles",
      done: supports,
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
      key: "agreement",
      label: "Convention déposée",
      detail: i.agreementDeposited
        ? "Convention de formation déposée"
        : "À déposer dans l’onglet Documents (ne bloque pas la facture)",
      done: !!i.agreementDeposited,
    },
    ...(i.feedbackResponses !== undefined
      ? [
          {
            key: "feedback" as const,
            label: "Avis des étudiant·es",
            detail:
              i.feedbackResponses === null
                ? "Pas encore envoyé"
                : `${i.feedbackResponses} réponse${i.feedbackResponses > 1 ? "s" : ""}`,
            done: (i.feedbackResponses ?? 0) > 0,
            optional: true,
          },
        ]
      : []),
  ];
  return items.map((it) => ({ ...it, href: i.hrefs?.[it.key] }));
}
