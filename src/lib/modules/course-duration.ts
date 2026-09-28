/**
 * US-60 : horaires et durée par séance. Fonctions pures : durée d'un créneau, total planifié
 * d'un module et cohérence avec le volume d'heures annoncé.
 */

/** Heure `HH:MM` (ou `HH:MM:SS`, tel que renvoyé par Postgres), `null` si absente. */
export type TimeString = string | null | undefined;

/** Heure en minutes depuis minuit, `null` si absente ou invalide. */
export function parseTime(time: TimeString): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time);
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** `HH:MM` sans les secondes de Postgres ; chaîne vide si absente. */
export function formatTime(time: TimeString): string {
  const minutes = parseTime(time);
  if (minutes === null) return "";
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** « 10:00–12:00 », « 10:00 » sans fin, chaîne vide sans début. */
export function formatTimeRange(start: TimeString, end: TimeString): string {
  const s = formatTime(start);
  const e = formatTime(end);
  if (!s) return "";
  return e ? `${s}–${e}` : s;
}

/** Durée en heures entre début et fin ; `null` si l'un manque ou si la fin ne suit pas le début. */
export function calculateDuration(start: TimeString, end: TimeString): number | null {
  const from = parseTime(start);
  const to = parseTime(end);
  if (from === null || to === null || to <= from) return null;
  return (to - from) / 60;
}

/** « 2 h », « 1 h 30 », « 45 min » ; chaîne vide pour `null`. */
export function formatDuration(hours: number | null): string {
  if (hours === null) return "";
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h} h ${String(m).padStart(2, "0")}`;
  if (h > 0) return `${h} h`;
  return `${m} min`;
}

/** Total planifié : seules les séances avec début et fin valides comptent. */
export function totalPlannedHours(
  courses: { start_time?: TimeString; end_time?: TimeString }[],
): number {
  return courses.reduce((sum, c) => sum + (calculateDuration(c.start_time, c.end_time) ?? 0), 0);
}

export interface PlannedHoursCheck {
  consistent: boolean;
  /** Écart en heures : négatif = il manque des heures, positif = trop d'heures. */
  gap: number;
  /** Avertissement prêt à afficher, vide si cohérent. */
  message: string;
}

/** Tolérance d'arrondi entre heures planifiées et volume annoncé. */
const TOLERANCE_HOURS = 0.5;

/** Compare les heures planifiées au volume du module ; ne corrige rien, signale seulement. */
export function checkPlannedHours(planned: number, moduleTotal: number): PlannedHoursCheck {
  const gap = planned - moduleTotal;
  if (Math.abs(gap) <= TOLERANCE_HOURS) return { consistent: true, gap, message: "" };
  return {
    consistent: false,
    gap,
    message:
      gap < 0
        ? `Il manque ${formatDuration(-gap)} par rapport aux ${moduleTotal} h du module.`
        : `${formatDuration(gap)} de plus que les ${moduleTotal} h du module.`,
  };
}
