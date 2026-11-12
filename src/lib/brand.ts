/** Nom de l'appli, à un seul endroit (rebranding « Marelle », novembre 2026). */
export const APP_NAME = "Marelle";
/** Phrase de présentation publique (description de page, aperçus de liens). */
export const APP_TAGLINE = "Marelle : préparer, faire cours, corriger et suivre ses étudiant·es";

/**
 * Expéditeur des e-mails envoyés par l'appli : « Marie via Marelle <adresse technique> ».
 * L'adresse d'expédition (variable RESEND_FROM) ne change pas ; seul le nom affiché change.
 */
export function appSender(resendFrom: string): string {
  const match = resendFrom.match(/<([^>]+)>/);
  const address = (match ? match[1] : resendFrom).trim();
  return `Marie via ${APP_NAME} <${address}>`;
}
