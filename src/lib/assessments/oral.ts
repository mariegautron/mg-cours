import { seededRandom, shuffle } from "@/lib/projects/draw";

/**
 * Oral de fin de projet (US-92) : ordre de passage, créneaux, groupe courant. Fonctions pures.
 */

/** Durée par défaut d'un passage quand ni le créneau ni l'évaluation n'en précisent. */
export const DEFAULT_ORAL_MINUTES = 15;

export type OralMethod = "volunteer" | "draw";

export interface OralOrderEntry {
  groupId: string;
  method: OralMethod;
}

/**
 * Ordre de passage : les volontaires passent d'abord, dans l'ordre où Marie les a notés, puis les
 * autres groupes dans un ordre tiré au sort. Reproductible : mêmes groupes, mêmes volontaires et même
 * graine → même ordre, quel que soit l'ordre de la liste des groupes.
 */
export function orderOral(input: {
  groupIds: readonly string[];
  /** Groupes volontaires, dans l'ordre de passage voulu. */
  volunteers: readonly string[];
  seed: string;
}): OralOrderEntry[] {
  const known = new Set(input.groupIds);
  const volunteers = [...new Set(input.volunteers)].filter((id) => known.has(id));
  const taken = new Set(volunteers);
  const rest = [...known].filter((id) => !taken.has(id)).sort();
  return [
    ...volunteers.map((groupId) => ({ groupId, method: "volunteer" as const })),
    ...shuffle(rest, seededRandom(input.seed)).map((groupId) => ({
      groupId,
      method: "draw" as const,
    })),
  ];
}

/** Durée d'un passage : créneau, sinon évaluation, sinon 15 minutes. */
export function slotDuration(
  slotMinutes: number | null | undefined,
  assessmentMinutes: number | null | undefined,
): number {
  if (slotMinutes && slotMinutes > 0) return slotMinutes;
  if (assessmentMinutes && assessmentMinutes > 0) return assessmentMinutes;
  return DEFAULT_ORAL_MINUTES;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function parseClock(value: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value ?? "");
  if (!m) return null;
  const minutes = Number(m[1]) * 60 + Number(m[2]);
  return Number(m[1]) < 24 && Number(m[2]) < 60 ? minutes : null;
}

export function formatClock(totalMinutes: number): string {
  const minutes = ((totalMinutes % 1440) + 1440) % 1440;
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/**
 * Horaires des créneaux, mis bout à bout à partir de l'heure de début (`null` sans heure de début :
 * seules les durées sont affichées).
 */
export function oralSchedule(
  startTime: string | null,
  durations: readonly number[],
): { start: string | null; end: string | null; minutes: number }[] {
  let cursor = parseClock(startTime);
  return durations.map((minutes) => {
    const start = cursor === null ? null : formatClock(cursor);
    if (cursor !== null) cursor += minutes;
    return { start, end: cursor === null ? null : formatClock(cursor), minutes };
  });
}

/** Le premier groupe qui n'est pas encore passé (`null` : tout le monde est passé). */
export function firstWaiting<T extends { status: "waiting" | "done" }>(
  slots: readonly T[],
): T | null {
  return slots.find((s) => s.status === "waiting") ?? null;
}

/** Groupe suivant dans l'ordre de passage, en sautant ceux qui sont déjà passés. */
export function nextWaiting<T extends { id: string; status: "waiting" | "done" }>(
  slots: readonly T[],
  currentId: string,
): T | null {
  const index = slots.findIndex((s) => s.id === currentId);
  if (index === -1) return firstWaiting(slots);
  return slots.slice(index + 1).find((s) => s.status === "waiting") ?? null;
}

/** Échange deux créneaux voisins ; renvoie les nouvelles positions (1..N) dans le nouvel ordre. */
export function moveSlot<T extends { id: string }>(
  slots: readonly T[],
  id: string,
  direction: -1 | 1,
): T[] {
  const index = slots.findIndex((s) => s.id === id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= slots.length) return [...slots];
  const next = [...slots];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Vrai pour une évaluation d'oral : note de groupe rattachée à un projet comme oral, ou de type « oral ». */
export function isOralAssessment(a: {
  is_group_grade: boolean;
  project_role: string | null;
  type: string | null;
}): boolean {
  if (!a.is_group_grade) return false;
  return a.project_role === "oral" || /\boral\b/i.test(a.type ?? "");
}
