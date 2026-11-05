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

/**
 * Position mémorisée d'une séance (diapositive et mode), partagée par les deux fenêtres via
 * `localStorage` (même origine, même navigateur). Une fenêtre qui s'ouvre ou s'actualise la relit
 * et rejoint l'autre ; elle ne la ramène jamais en arrière.
 */
export interface SavedPosition {
  index: number;
  mode: "document" | "slides";
}

export const positionStorageKey = (channel: string): string => `mg-pos:${channel}`;

export function serializePosition(position: SavedPosition): string {
  return JSON.stringify(position);
}

/** Relit une position enregistrée ; tout ce qui n'a pas la forme attendue est ignoré. */
export function parsePosition(raw: string | null, total: number): SavedPosition | null {
  if (!raw || total <= 0) return null;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (!isIndex(v.index)) return null;
    if (v.mode !== "document" && v.mode !== "slides") return null;
    return { index: clampIndex(v.index, total), mode: v.mode };
  } catch {
    return null;
  }
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

/** « 1 h 05 écoulée » depuis l'heure de début (`HH:MM`) ; `null` sans heure de début ou avant le début. */
export function elapsedLabel(nowMinutes: number, startTime: string | null): string | null {
  const m = startTime ? /^(\d{1,2}):(\d{2})/.exec(startTime) : null;
  if (!m) return null;
  const done = nowMinutes - (Number(m[1]) * 60 + Number(m[2]));
  if (done < 0) return null;
  const h = Math.floor(done / 60);
  const r = done % 60;
  if (h && r) return `${h} h ${String(r).padStart(2, "0")} écoulée`;
  return h ? `${h} h écoulée` : `${r} min écoulée`;
}
