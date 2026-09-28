import { z } from "zod";

import { calculateDuration } from "./course-duration";

/**
 * US-59 : planning d'un module. Fonctions pures — saisie en tableau ou collage, un créneau par
 * ligne, formats français tolérés — qui produisent les séances vides à créer.
 */

/** Un créneau du planning : date ISO, heures `HH:MM` facultatives. */
export interface ScheduleRow {
  date: string;
  startTime: string | null;
  endTime: string | null;
}

export interface IgnoredLine {
  line: number;
  text: string;
}

export interface PlannedSession {
  number: number;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  /** Durée en heures, `null` sans début et fin. */
  hours: number | null;
}

export interface SchedulePlan {
  sessions: PlannedSession[];
  /** Date de la 1re séance (sert au calcul de l'échéance J-15). */
  firstSessionDate: string | null;
  /** Total des heures planifiées (créneaux avec début et fin). */
  totalHours: number;
  /** Anomalies à signaler avant création (chevauchement, doublon). */
  issues: string[];
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const scheduleRowSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(TIME).nullable(),
  endTime: z.string().regex(TIME).nullable(),
});

const MAX_ROWS = 200;

/** Lit le champ caché `scheduleJson` ; renvoie `null` si le contenu est invalide. */
export function readScheduleRows(json: string | null | undefined): ScheduleRow[] | null {
  if (!json || !json.trim()) return [];
  try {
    const parsed = z.array(scheduleRowSchema).max(MAX_ROWS).safeParse(JSON.parse(json));
    if (!parsed.success) return null;
    return parsed.data.filter((row) => isValidIsoDate(row.date));
  } catch {
    return null;
  }
}

/** Vrai pour une date ISO qui existe au calendrier (pas de 31/02). */
export function isValidIsoDate(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** Ajoute des jours à une date ISO (calcul en UTC, sans effet de fuseau ni d'heure d'été). */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** « Dupliquer + 7 jours » : même créneau la semaine suivante. */
export function duplicateRow(row: ScheduleRow, days = 7): ScheduleRow {
  return { ...row, date: addDays(row.date, days) };
}

const pad = (n: number | string) => String(n).padStart(2, "0");

function toIsoDate(day: string, month: string, year: string | undefined, defaultYear: number) {
  let y = year === undefined ? defaultYear : Number(year);
  if (year !== undefined && year.length === 2) y += 2000;
  const iso = `${y}-${pad(month)}-${pad(day)}`;
  return isValidIsoDate(iso) ? iso : null;
}

const DATE_RE = /(\d{1,2})\s*[/.-]\s*(\d{1,2})(?:\s*[/.-]\s*(\d{4}|\d{2}))?(?!\d)/;
const TIME_RE = /(\d{1,2})\s*(?:h|:)(\d{2})?/gi;

/**
 * Lit une ligne collée : « 01/10/2026 10:00-12:00 », « jeudi 1/10 10h-12h »,
 * « 01-10-2026 10h00 12h00 », « 01.10.26 de 14h à 16h »… L'année manquante est celle du module.
 */
export function parseScheduleLine(line: string, defaultYear: number): ScheduleRow | null {
  const dateMatch = DATE_RE.exec(line);
  if (!dateMatch) return null;
  const date = toIsoDate(dateMatch[1], dateMatch[2], dateMatch[3], defaultYear);
  if (!date) return null;

  const rest =
    line.slice(0, dateMatch.index) + " " + line.slice(dateMatch.index + dateMatch[0].length);
  const times: string[] = [];
  for (const m of rest.matchAll(TIME_RE)) {
    const hours = Number(m[1]);
    const minutes = m[2] === undefined ? 0 : Number(m[2]);
    if (hours > 23 || minutes > 59) return null;
    times.push(`${pad(hours)}:${pad(minutes)}`);
  }
  if (times.length > 2) return null;
  return { date, startTime: times[0] ?? null, endTime: times[1] ?? null };
}

/** Lit un planning collé (une ligne par créneau) ; les lignes illisibles sont renvoyées à part. */
export function parseSchedule(
  text: string,
  defaultYear: number,
): { rows: ScheduleRow[]; ignored: IgnoredLine[] } {
  const rows: ScheduleRow[] = [];
  const ignored: IgnoredLine[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const row = parseScheduleLine(line, defaultYear);
    if (row) rows.push(row);
    else ignored.push({ line: i + 1, text: line });
  });
  return { rows, ignored };
}

const rowKey = (r: ScheduleRow) => `${r.date} ${r.startTime ?? "99:99"}`;

/**
 * Séances vides à créer : triées par date puis heure, numérotées « Séance N » à la suite des
 * `existingCount` séances déjà présentes.
 */
export function planSessions(rows: ScheduleRow[], existingCount = 0): SchedulePlan {
  const sorted = [...rows].sort((a, b) => rowKey(a).localeCompare(rowKey(b)));
  const issues: string[] = [];

  const sessions = sorted.map((r, i): PlannedSession => {
    const number = existingCount + i + 1;
    return {
      number,
      title: `Séance ${number}`,
      date: r.date,
      startTime: r.startTime,
      endTime: r.endTime,
      hours: calculateDuration(r.startTime, r.endTime),
    };
  });

  for (let i = 1; i < sessions.length; i++) {
    const prev = sessions[i - 1];
    const cur = sessions[i];
    if (prev.date !== cur.date) continue;
    if (prev.startTime === cur.startTime) {
      issues.push(`Séances ${prev.number} et ${cur.number} : même créneau le ${cur.date}.`);
    } else if (prev.endTime && cur.startTime && cur.startTime < prev.endTime) {
      issues.push(
        `Séances ${prev.number} et ${cur.number} : les horaires se chevauchent le ${cur.date}.`,
      );
    }
  }

  return {
    sessions,
    firstSessionDate: sessions[0]?.date ?? null,
    totalHours: sessions.reduce((sum, s) => sum + (s.hours ?? 0), 0),
    issues,
  };
}
