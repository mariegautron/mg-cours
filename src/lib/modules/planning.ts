/** Planning d'un module : séances groupées par jour, avec leur déroulé minuté (fonctions pures). */

export interface PlanningInput {
  id: string;
  position: number;
  title: string;
  sessionDate: string | null;
  startTime: string | null;
  endTime: string | null;
  items: { title: string; startTime: string | null; minutes: number | null }[];
  assessments: { title: string; type: string | null; oralStartTime: string | null }[];
}

export interface PlanningRow {
  kind: "item" | "pause";
  start: string;
  end: string;
  title: string;
  minutes: number;
}

export interface PlanningSession extends Omit<PlanningInput, "items"> {
  /** Déroulé trié, avec les trous de 5 minutes ou plus signalés comme « Pause / marge ». */
  rows: PlanningRow[];
  /** Éléments rattachés à la séance sans horaire. */
  unscheduled: string[];
}

export interface PlanningDay {
  date: string | null;
  sessions: PlanningSession[];
}

const toMinutes = (t: string): number => {
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
};

export const hhmm = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export function buildSession(input: PlanningInput): PlanningSession {
  const scheduled = input.items
    .filter((i) => i.startTime && i.minutes)
    .map((i) => ({ title: i.title, start: toMinutes(i.startTime!), minutes: i.minutes! }))
    .sort((a, b) => a.start - b.start);
  const rows: PlanningRow[] = [];
  let cursor: number | null = input.startTime ? toMinutes(input.startTime) : null;
  for (const item of scheduled) {
    if (cursor !== null && item.start - cursor >= 5) {
      rows.push({
        kind: "pause",
        start: hhmm(cursor),
        end: hhmm(item.start),
        title: "Pause ou marge",
        minutes: item.start - cursor,
      });
    }
    rows.push({
      kind: "item",
      start: hhmm(item.start),
      end: hhmm(item.start + item.minutes),
      title: item.title,
      minutes: item.minutes,
    });
    cursor = item.start + item.minutes;
  }
  const end = input.endTime ? toMinutes(input.endTime) : null;
  if (cursor !== null && end !== null && end - cursor >= 5) {
    rows.push({
      kind: "pause",
      start: hhmm(cursor),
      end: hhmm(end),
      title: "Pause ou marge",
      minutes: end - cursor,
    });
  }
  const { items, ...rest } = input;
  return {
    ...rest,
    rows,
    unscheduled: items.filter((i) => !(i.startTime && i.minutes)).map((i) => i.title),
  };
}

/** Jours dans l'ordre chronologique ; séances d'un même jour triées par heure de début. */
export function buildPlanning(inputs: PlanningInput[]): PlanningDay[] {
  const days = new Map<string | null, PlanningSession[]>();
  for (const input of inputs) {
    const list = days.get(input.sessionDate) ?? [];
    list.push(buildSession(input));
    days.set(input.sessionDate, list);
  }
  return [...days.entries()]
    .sort(([a], [b]) => (a ?? "9999").localeCompare(b ?? "9999"))
    .map(([date, sessions]) => ({
      date,
      sessions: sessions.sort(
        (a, b) =>
          (a.startTime ?? "99").localeCompare(b.startTime ?? "99") || a.position - b.position,
      ),
    }));
}
