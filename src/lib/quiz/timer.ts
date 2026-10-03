/** « 12 min 05 s », « 45 s ». */
export function formatRemaining(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = String(s % 60).padStart(2, "0");
  return m > 0 ? `${m} min ${r} s` : `${s} s`;
}

/**
 * Annonces pour les lecteurs d'écran, sans interruption excessive (aria-live polite) : une fois à
 * 5 minutes, une fois à 1 minute, une fois à la fin. Rien entre ces instants.
 */
export function announcementAt(remainingSeconds: number): string | null {
  if (remainingSeconds === 300) return "Il reste 5 minutes.";
  if (remainingSeconds === 60) return "Il reste 1 minute.";
  if (remainingSeconds === 0) return "Le temps est écoulé : ta copie est rendue automatiquement.";
  return null;
}

/** Minutes entières restantes avant `iso` (0 si passé) ; `null` sans date. */
export function minutesUntil(iso: string | null, now: number = Date.now()): number | null {
  if (!iso) return null;
  return Math.max(0, Math.round((new Date(iso).getTime() - now) / 60000));
}
