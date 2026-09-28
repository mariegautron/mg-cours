/** US-60: Horaires et duree par seance.
 * Fonctions pures pour calculer la duree et verifier la coherence des heures.
 */

/** Format d'heure : HH:MM */
export type TimeString = string | null;

/** Parse une heure au format HH:MM en minutes depuis minuit. */
export function parseTime(time: TimeString): number | null {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (
    isNaN(hours) ||
    isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

/** Calcule la duree en heures entre deux heures (start_time, end_time).
 * Retourne null si les heures sont manquantes ou invalides.
 * La duree est arrondie a 0.25h (15 min) le plus proche.
 */
export function calculateDuration(
  start_time: TimeString,
  end_time: TimeString,
): number | null {
  const start = parseTime(start_time);
  const end = parseTime(end_time);

  if (start === null || end === null) return null;
  if (end <= start) return null;

  const minutes = end - start;
  // Arrondi a 15 min (0.25h) le plus proche
  const rounded = Math.round(minutes / 15) * 15;
  return rounded / 60;
}

/** Formate une duree en heures au format lisible.
 * Exemples: 1.5 -> "1 h 30", 2 -> "2 h", 0.75 -> "45 min"
 */
export function formatDuration(hours: number | null): string {
  if (hours === null) return "";
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h} h ${m}`;
  if (h > 0) return `${h} h`;
  return `${m} min`;
}

/** Calcule la duree totale planifiee pour une liste de seances.
 * Seules les seances avec startTime et endTime valides sont prises en compte.
 */
export function totalPlannedHours(courses: Array<{ start_time?: string | null; end_time?: string | null }>): number {
  let total = 0;
  for (const course of courses) {
    const duration = calculateDuration(course.start_time ?? null, course.end_time ?? null);
    if (duration !== null) {
      total += duration;
    }
  }
  return total;
}

/** Verifie si la duree totale planifiee correspond aux heures du module.
 * Retourne un message d'avertissement si incoherence > 0.5h.
 */
export function checkPlannedHours(
  plannedHours: number,
  moduleTotalHours: number,
): { consistent: boolean; message: string } {
  const diff = Math.abs(plannedHours - moduleTotalHours);
  if (diff <= 0.5) {
    return { consistent: true, message: "" };
  }
  if (plannedHours < moduleTotalHours) {
    return {
      consistent: false,
      message: `${formatDuration(plannedHours)} planifiees / ${moduleTotalHours} h - il manque ${formatDuration(moduleTotalHours - plannedHours)}`,
    };
  }
  return {
    consistent: false,
    message: `${formatDuration(plannedHours)} planifiees / ${moduleTotalHours} h - excess de ${formatDuration(plannedHours - moduleTotalHours)}`,
  };
}
