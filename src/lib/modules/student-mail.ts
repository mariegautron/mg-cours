/**
 * E-mail du lien personnel de l'espace étudiant·e : vouvoiement, sobre, signé de l'enseignante.
 * Fonction pure. Le lien n'est jamais relisible après sa création : il part dans ce message.
 */
export function studentLinkEmail(input: {
  firstName: string;
  moduleName: string;
  url: string;
  teacherName: string;
}): { subject: string; text: string } {
  const greeting = input.firstName.trim() ? `Bonjour ${input.firstName.trim()},` : "Bonjour,";
  const signature = input.teacherName.trim() || "Votre enseignante";
  return {
    subject: `Votre espace pour le module « ${input.moduleName} »`,
    text: [
      greeting,
      "",
      `Votre espace personnel pour le module « ${input.moduleName} » est ouvert. Vous y retrouverez le planning, les cours, le projet, les évaluations et, lorsqu’ils seront publiés, vos résultats.`,
      "",
      `Accéder à votre espace : ${input.url}`,
      "",
      "Ce lien est personnel : merci de ne pas le partager.",
      "",
      "Cordialement,",
      signature,
    ].join("\n"),
  };
}

/** Extrait le jeton d'une adresse `/espace/<jeton>` ; `null` si l'adresse n'a pas cette forme. */
export function tokenFromSpaceUrl(url: string): string | null {
  return /\/espace\/([A-Za-z0-9_-]{20,})\/?$/.exec(url.trim())?.[1] ?? null;
}
