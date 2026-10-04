/** Destination après connexion ou réinitialisation : un chemin de l'appli, jamais un autre site. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\"))
    return fallback;
  return next;
}

export const MIN_PASSWORD_LENGTH = 8;

/** Vérifie un nouveau mot de passe saisi deux fois ; renvoie un message ou `null` si c'est bon. */
export function passwordProblem(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.`;
  }
  if (password !== confirm) return "Les deux mots de passe ne sont pas identiques.";
  return null;
}
