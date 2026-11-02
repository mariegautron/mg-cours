export interface TodayCourse {
  id: string;
  title: string;
  position: number;
  session_date: string | null;
  start_time: string | null;
  end_time: string | null;
  prep_status?: string;
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

/** Heure courante (HH:MM) à Paris, pour comparer aux `end_time` des séances. */
export function timeInParis(now: Date = new Date()): string {
  return now.toLocaleTimeString("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

/**
 * Séances du jour pas encore terminées à `nowTime` (HH:MM) : la séance en cours ou la suivante
 * passe en tête de la carte « Aujourd'hui ». Une séance sans heure de fin reste affichée ; si
 * toutes sont terminées, on garde la dernière.
 */
export function remainingSessions<C extends TodayCourse>(sessions: C[], nowTime: string): C[] {
  const left = sessions.filter((c) => !c.end_time || c.end_time.slice(0, 5) > nowTime);
  return left.length ? left : sessions.slice(-1);
}

/**
 * Prochaine séance datée après `today` (modules non archivés) : la plus proche, puis par heure de
 * début (sans horaire à la fin), module et ordre dans le module. `null` s'il n'y en a aucune.
 */
export function nextSession<C extends TodayCourse>(
  courses: C[],
  today: string,
): (C & { module: NonNullable<C["module"]> }) | null {
  const upcoming = courses
    .filter(
      (c): c is C & { module: NonNullable<C["module"]> } =>
        !!c.session_date && c.session_date > today && !!c.module && !c.module.archived_at,
    )
    .sort(
      (a, b) =>
        a.session_date!.localeCompare(b.session_date!) ||
        (a.start_time ?? "99:99").localeCompare(b.start_time ?? "99:99") ||
        a.module.name.localeCompare(b.module.name, "fr") ||
        a.position - b.position,
    );
  return upcoming[0] ?? null;
}

/** « jeudi 2 octobre » pour une date AAAA-MM-JJ. */
export function formatSessionDay(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * Phrase de la carte « Aujourd'hui » quand il n'y a pas cours : on dit que ce n'est pas un bug,
 * et quand est la suite (« Pas de cours aujourd'hui. Prochain : jeudi 2 octobre, Agile — Séance 3. »).
 */
export function noSessionSentence(next: TodayCourse | null): string {
  if (!next?.module || !next.session_date) return "Pas de cours aujourd’hui.";
  return `Pas de cours aujourd’hui. Prochain : ${formatSessionDay(next.session_date)}, ${next.module.name} — Séance ${next.position}.`;
}
