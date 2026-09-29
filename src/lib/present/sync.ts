/**
 * US-64 : vue présentatrice — deux fenêtres (projetée et présentatrice) synchronisées par
 * BroadcastChannel, donc limitées à la même origine et au même navigateur. Seuls des indices de
 * diapositive circulent : jamais de contenu, jamais de donnée du carnet.
 */

export type SyncMessage =
  /** La fenêtre projetée annonce la diapositive affichée. */
  | { type: "state"; index: number; total: number }
  /** La fenêtre présentatrice demande d'afficher une diapositive. */
  | { type: "go"; index: number }
  /** Une fenêtre qui s'ouvre demande l'état courant. */
  | { type: "hello" };

/** Un canal par séance : deux séances ouvertes en même temps ne se pilotent pas entre elles. */
export function syncChannelName(courseId: string): string {
  return `mg-present:${courseId}`;
}

const isIndex = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

/** Valide un message reçu : tout ce qui n'a pas la forme attendue est ignoré. */
export function parseSyncMessage(data: unknown): SyncMessage | null {
  if (typeof data !== "object" || data === null) return null;
  const m = data as Record<string, unknown>;
  if (m.type === "hello") return { type: "hello" };
  if (m.type === "go" && isIndex(m.index)) return { type: "go", index: m.index };
  if (m.type === "state" && isIndex(m.index) && isIndex(m.total) && m.total > 0) {
    return { type: "state", index: m.index, total: m.total };
  }
  return null;
}

/** Ramène un index reçu dans les bornes du diaporama. */
export function clampIndex(index: number, total: number): number {
  return Math.min(Math.max(total - 1, 0), Math.max(0, index));
}

/** Minutes écoulées depuis minuit à Paris. */
export function minutesInParis(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

/** « 14:32 » à Paris. */
export function clockInParis(now: Date = new Date()): string {
  const m = minutesInParis(now);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/**
 * Temps restant avant l'heure de fin de la séance (`HH:MM`, US-60) : « Il reste 48 min »,
 * « Séance terminée depuis 5 min ». `null` sans heure de fin.
 */
export function remainingLabel(nowMinutes: number, endTime: string | null): string | null {
  const m = endTime ? /^(\d{1,2}):(\d{2})/.exec(endTime) : null;
  if (!m) return null;
  const left = Number(m[1]) * 60 + Number(m[2]) - nowMinutes;
  const fmt = (min: number) => {
    const h = Math.floor(min / 60);
    const r = min % 60;
    if (h && r) return `${h} h ${String(r).padStart(2, "0")}`;
    return h ? `${h} h` : `${r} min`;
  };
  if (left > 0) return `Il reste ${fmt(left)}`;
  if (left === 0) return "C’est l’heure de finir";
  return `Séance terminée depuis ${fmt(-left)}`;
}
