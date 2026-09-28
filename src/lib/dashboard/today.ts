export interface TodayCourse {
  id: string;
  title: string;
  position: number;
  session_date: string | null;
  start_time: string | null;
  end_time: string | null;
  module: { id: string; name: string; archived_at: string | null } | null;
}

/**
 * Séances du jour pour la carte « Aujourd'hui » (US-63) : date = `today` (AAAA-MM-JJ, Paris, cf.
 * `todayInParis`), modules non archivés, triées par heure de début (sans horaire à la fin), puis par module et ordre dans le module.
 */
export function todaySessions<C extends TodayCourse>(
  courses: C[],
  today: string,
): (C & { module: NonNullable<C["module"]> })[] {
  return courses
    .filter(
      (c): c is C & { module: NonNullable<C["module"]> } =>
        c.session_date === today && !!c.module && !c.module.archived_at,
    )
    .sort(
      (a, b) =>
        (a.start_time ?? "99:99").localeCompare(b.start_time ?? "99:99") ||
        a.module.name.localeCompare(b.module.name, "fr") ||
        a.position - b.position,
    );
}
