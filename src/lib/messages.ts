/**
 * Messages d'erreur des Server Actions : une cause dite simplement, la saisie « conservée »
 * seulement quand c'est vrai (formulaire qui garde ses champs, voir `useKeptFormSubmit`), et
 * toujours une issue. L'interface tutoie (voir `docs/DESIGN.md`, section « Ton »).
 */

export const RETRY = "Réessaie dans un instant.";
export const KEPT = "Ta saisie est conservée.";

/**
 * « On n'a pas pu <action>. » + issue. `kept` : à mettre à `true` seulement si le formulaire garde
 * ce que Marie a saisi (sinon on ne promet rien).
 */
export function failure(action: string, opts: { kept?: boolean } = {}): string {
  return `On n’a pas pu ${action}. ${opts.kept ? `${KEPT} ${RETRY}` : RETRY}`;
}

/** Session expirée : la saisie reste affichée, on se reconnecte dans un autre onglet. */
export const SESSION_EXPIRED =
  "Ta session a expiré. Reconnecte-toi dans un nouvel onglet, puis réessaie ici : ta saisie reste affichée.";

/** Élément supprimé ou lien ancien : dit ce qui se passe, l'issue est le lien de `actionLink`. */
export const NOT_FOUND = {
  module: "Ce module n’existe plus.",
  invoice: "Cette facture n’existe plus.",
  assessment: "Cette évaluation n’existe plus.",
  course: "Cette séance n’existe plus.",
  group: "Ce groupe n’existe plus.",
  project: "Ce projet n’existe plus.",
  resource: "Cette ressource n’existe plus.",
  student: "Cet·te étudiant·e n’existe plus.",
  criterion: "Ce critère n’existe plus.",
} as const;

/** Lien d'issue associé à un message connu (`null` si le message n'en appelle pas). */
export function actionLink(
  message: string,
): { href: string; label: string; newTab: boolean } | null {
  if (message === SESSION_EXPIRED) {
    return { href: "/login", label: "Te reconnecter (nouvel onglet)", newTab: true };
  }
  const back: Record<string, { href: string; label: string }> = {
    [NOT_FOUND.module]: { href: "/modules", label: "Retour à la liste des modules" },
    [NOT_FOUND.invoice]: { href: "/billing", label: "Retour à la facturation" },
    [NOT_FOUND.assessment]: { href: "/assessments", label: "Retour aux évaluations" },
    [NOT_FOUND.resource]: { href: "/resources", label: "Retour aux ressources" },
    [NOT_FOUND.student]: { href: "/students", label: "Retour aux étudiant·es" },
  };
  const found = back[message];
  return found ? { ...found, newTab: false } : null;
}

/** Envoi d'e-mails non activé : aucun nom de variable d'environnement dans l'interface. */
export const EMAIL_NOT_ENABLED =
  "L’envoi d’e-mails n’est pas encore activé. Télécharge le PDF et envoie-le toi-même.";
