/**
 * US-160 : terminer et ranger un module depuis la liste. Fonctions pures : délai d'annulation,
 * état restauré, filtre « En cours / Rangés », mot « Ce que je retiens ».
 */

/** Pendant ce délai, « Annuler » remet le module comme avant (10 secondes, comme la maquette). */
export const UNDO_WINDOW_MS = 10_000;
/** Marge côté serveur : le réseau peut retarder l'annulation sans la refuser à tort. */
export const UNDO_GRACE_MS = 5_000;

/**
 * Le module peut-il être restauré par « Annuler » ? Seulement s'il est toujours rangé par CE
 * rangement (même horodatage) et si le délai n'est pas dépassé : un autre rangement, fait plus
 * tard, ne se défait pas par un vieux « Annuler ».
 */
export function canUndoArchive(
  currentArchivedAt: string | null,
  token: string,
  nowMs: number,
): boolean {
  if (!currentArchivedAt) return false;
  // Comparaison par instant : la base renvoie « …+00:00 », le jeton est en « …Z ».
  const archivedMs = Date.parse(token);
  if (!Number.isFinite(archivedMs) || Date.parse(currentArchivedAt) !== archivedMs) return false;
  return nowMs - archivedMs <= UNDO_WINDOW_MS + UNDO_GRACE_MS;
}

/** Valeur de `archived_at` après « Annuler » : le module redevient « en cours » (état d'avant). */
export const RESTORED_ARCHIVED_AT = null;

export const NOTE_MAX = 4000;

/** « Ce que je retiens » : texte nettoyé, `null` si vide, erreur au-delà de la limite. */
export function cleanRetrospective(
  input: string | null | undefined,
): { note: string | null } | { error: string } {
  const note = (input ?? "").replace(/\r\n/g, "\n").trim();
  if (note.length > NOTE_MAX) return { error: `${NOTE_MAX} caractères maximum.` };
  return { note: note || null };
}

/** Message de confirmation affiché après le rangement. */
export function archivedMessage(name: string): string {
  return `« ${name} » est rangé.`;
}
