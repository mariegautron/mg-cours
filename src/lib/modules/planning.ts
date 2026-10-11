/** Planning d'un module : séances groupées par jour, avec leur déroulé minuté (fonctions pures). */

export type PlanningCategory = "cours" | "pratique" | "projet" | "evaluation";

export interface PlanningInput {
  id: string;
  position: number;
  title: string;
  sessionDate: string | null;
  startTime: string | null;
  endTime: string | null;
  items: {
    title: string;
    startTime: string | null;
    minutes: number | null;
    category?: PlanningCategory;
  }[];
  assessments: { title: string; type: string | null; oralStartTime: string | null }[];
}

export interface PlanningRow {
  kind: "item" | "pause";
  category: PlanningCategory | null;
  start: string;
  end: string;
  /** Minutes depuis le début de la séance. */
  offset: number;
  /** Position et hauteur à l'écran, en minutes : les longues pauses sont écourtées. */
  displayOffset: number;
  displayMinutes: number;
  title: string;
  minutes: number;
}

export interface PlanningSession extends Omit<PlanningInput, "items"> {
  /** Déroulé trié, avec les trous de 5 minutes ou plus signalés comme « Pause / marge ». */
  rows: PlanningRow[];
  /** Éléments rattachés à la séance sans horaire. */
  unscheduled: string[];
  /** Durée réelle de la séance, en minutes (0 sans horaire). */
  totalMinutes: number;
  /** Hauteur à l'écran, en minutes, une fois les longues pauses écourtées. */
  displayTotal: number;
}

export interface PlanningDay {
  date: string | null;
  sessions: PlanningSession[];
}

/** Une pause ou marge n'occupe jamais plus que cette durée à l'écran. */
export const MAX_PAUSE_DISPLAY = 40;

const toMinutes = (t: string): number => {
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
};

export const hhmm = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export function buildSession(input: PlanningInput): PlanningSession {
  const scheduled = input.items
    .filter((i) => i.startTime && i.minutes)
    .map((i) => ({
      title: i.title,
      start: toMinutes(i.startTime!),
      minutes: i.minutes!,
      category: i.category ?? "cours",
    }))
    .sort((a, b) => a.start - b.start);
  const origin = input.startTime ? toMinutes(input.startTime) : (scheduled[0]?.start ?? 0);
  const end = input.endTime
    ? toMinutes(input.endTime)
    : Math.max(origin, ...scheduled.map((s) => s.start + s.minutes));
  const rows: PlanningRow[] = [];
  let cursor = origin;
  const pause = (from: number, to: number) =>
    rows.push({
      kind: "pause",
      category: null,
      start: hhmm(from),
      end: hhmm(to),
      offset: from - origin,
      displayOffset: 0,
      displayMinutes: 0,
      title: "Pause ou marge",
      minutes: to - from,
    });
  for (const item of scheduled) {
    if (item.start - cursor >= 5) pause(cursor, item.start);
    rows.push({
      kind: "item",
      category: item.category,
      start: hhmm(item.start),
      end: hhmm(item.start + item.minutes),
      offset: item.start - origin,
      displayOffset: 0,
      displayMinutes: 0,
      title: item.title,
      minutes: item.minutes,
    });
    cursor = Math.max(cursor, item.start + item.minutes);
  }
  if (scheduled.length && end - cursor >= 5) pause(cursor, end);
  let shown = 0;
  for (const row of rows) {
    row.displayOffset = shown;
    row.displayMinutes =
      row.kind === "pause" ? Math.min(row.minutes, MAX_PAUSE_DISPLAY) : row.minutes;
    shown += row.displayMinutes;
  }
  const { items, ...rest } = input;
  return {
    ...rest,
    displayTotal: shown,
    rows,
    unscheduled: items.filter((i) => !(i.startTime && i.minutes)).map((i) => i.title),
    totalMinutes: scheduled.length ? Math.max(end, cursor) - origin : 0,
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
