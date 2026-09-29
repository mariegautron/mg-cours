/**
 * Fiche YNOV importée à la création d'un module : chemins de stockage et message de résultat.
 * Fonctions pures. Le PDF est déposé par le navigateur dans un dossier « pending » (le module n'existe
 * pas encore), puis déplacé dans le dossier du module par la Server Action de création.
 */

export type FicheImportStatus = "read" | "review" | "failed";

export interface PendingFiche {
  path: string;
  name: string;
  size: number;
  mime: string;
}

const PENDING_DIR = "pending";

export function pendingFichePath(userId: string, uuid: string, safeFileName: string): string {
  return `${userId}/${PENDING_DIR}/${uuid}-${safeFileName}`;
}

/** Le chemin doit être un dépôt en attente de l'utilisatrice, sans échappement de dossier. */
export function isPendingFichePath(path: string, userId: string): boolean {
  return path.startsWith(`${userId}/${PENDING_DIR}/`) && !path.includes("..");
}

export function moduleFichePath(userId: string, moduleId: string, pendingPath: string): string {
  const fileName = pendingPath.split("/").pop() ?? "fiche.pdf";
  return `${userId}/${moduleId}/${fileName}`;
}

/** Lit le champ caché `ficheDoc` du formulaire ; `null` si absent ou invalide. */
export function readPendingFiche(raw: string, userId: string): PendingFiche | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingFiche>;
    if (
      typeof value.path !== "string" ||
      typeof value.name !== "string" ||
      typeof value.size !== "number" ||
      typeof value.mime !== "string" ||
      !isPendingFichePath(value.path, userId)
    ) {
      return null;
    }
    return { path: value.path, name: value.name, size: value.size, mime: value.mime };
  } catch {
    return null;
  }
}

export const FICHE_NOTICES: Record<FicheImportStatus, { text: string; tone: "ok" | "warn" }> = {
  read: {
    text: "La fiche de l’école est enregistrée et ses attendus sont lus. Vérifie-les dans « Attendus de l’école ».",
    tone: "ok",
  },
  review: {
    text: "La fiche de l’école est enregistrée, mais ses attendus sont à relire : ouvre « Attendus de l’école » pour les lire ou les saisir.",
    tone: "warn",
  },
  failed: {
    text: "Le module est créé, mais la fiche de l’école n’a pas pu être enregistrée. Dépose-la dans l’onglet Administratif, « Attendus de l’école ».",
    tone: "warn",
  },
};

export function ficheNotice(param: string | undefined) {
  return param === "read" || param === "review" || param === "failed" ? FICHE_NOTICES[param] : null;
}
