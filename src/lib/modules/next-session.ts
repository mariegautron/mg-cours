/** Date du jour (AAAA-MM-JJ) à Paris, pour comparer aux `session_date`. */
export function todayInParis(now: Date = new Date()): string {
  return now.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
}

/**
 * Séance à mettre en avant sur la fiche module : celle du jour, sinon la prochaine datée.
 * `null` si aucune séance datée n'est à venir.
 */
export function highlightedSession<T extends { session_date: string | null }>(
  courses: T[],
  today: string,
): { course: T; number: number; isToday: boolean } | null {
  let best = -1;
  for (let i = 0; i < courses.length; i++) {
    const date = courses[i].session_date;
    if (!date || date < today) continue;
    if (best === -1 || date < courses[best].session_date!) best = i;
  }
  if (best === -1) return null;
  const course = courses[best];
  return { course, number: best + 1, isToday: course.session_date === today };
}
