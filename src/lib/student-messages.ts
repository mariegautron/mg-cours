/**
 * Textes communs aux pages publiques. Règle de Marie : tutoiement pour ce qui s'adresse à une seule
 * personne (/espace, /resultats), vouvoiement pour ce qui s'adresse au groupe (/module, /retour).
 * Une page d'erreur ne sait pas quel lien c'était : elle suit le type d'adresse.
 */
export const TEACHER_NAME = "Marie";

export type Tone = "tu" | "vous";

/** Même message pour un lien faux, tronqué, remplacé ou retiré : on ne révèle jamais s'il a existé. */
export const INVALID_LINK_TITLE = "Ce lien ne fonctionne pas";

export function invalidLinkText(tone: Tone = "vous"): string {
  return tone === "tu"
    ? `Il a peut-être été remplacé, ou mal copié (vérifie qu’il est complet). Demande un nouveau lien à ${TEACHER_NAME}.`
    : `Il a peut-être été remplacé, ou mal copié (vérifiez qu’il est complet). Demandez un nouveau lien à ${TEACHER_NAME}.`;
}
export const INVALID_LINK_TEXT = invalidLinkText("vous");

export const THROTTLED_TITLE = "Trop d’essais";
export const UNAVAILABLE_TITLE = "Page momentanément indisponible";

export function throttledText(tone: Tone = "vous"): string {
  return tone === "tu" ? "Réessaie dans quelques minutes." : "Réessayez dans quelques minutes.";
}
export function unavailableText(tone: Tone = "vous"): string {
  return tone === "tu" ? "Réessaie dans un instant." : "Réessayez dans un instant.";
}
export const THROTTLED_TEXT = throttledText("vous");
export const UNAVAILABLE_TEXT = unavailableText("vous");
