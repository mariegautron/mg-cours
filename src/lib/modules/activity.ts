/**
 * Déroulé structuré d'une séance : chaque ressource du déroulé est une « activité » qui peut porter
 * une durée estimée, un type, un horaire de début, un objectif pédagogique et un état de préparation.
 * Fonctions pures : validation, total de durée, comparaison à la durée de la séance, horaires.
 */

export const ACTIVITY_TYPES = [
  { value: "lecture", label: "Cours" },
  { value: "exercice", label: "Exercice" },
  { value: "atelier", label: "Atelier" },
  { value: "discussion", label: "Discussion" },
  { value: "demo", label: "Démonstration" },
  { value: "evaluation", label: "Évaluation" },
  { value: "pause", label: "Pause" },
] as const;

export const OBJECTIVES = [
  "Comprendre",
  "Appliquer",
  "Analyser",
  "Développer",
  "Évaluer",
  "Créer",
] as const;

export const ACTIVITY_PREP_STATES = [
  { value: "not_started", label: "Pas commencé" },
  { value: "in_progress", label: "En cours" },
  { value: "ready", label: "Prêt" },
] as const;

export type ActivityPrepState = (typeof ACTIVITY_PREP_STATES)[number]["value"];

export interface Activity {
  durationMinutes: number | null;
  type: string | null;
  /** « HH:MM », ou `null` : l'horaire se déduit alors des durées précédentes. */
  startTime: string | null;
  objective: string | null;
  prepState: ActivityPrepState;
}

export const EMPTY_ACTIVITY: Activity = {
  durationMinutes: null,
  type: null,
  startTime: null,
  objective: null,
  prepState: "not_started",
};

const TYPE_VALUES: string[] = ACTIVITY_TYPES.map((t) => t.value);
const OBJECTIVE_VALUES: string[] = [...OBJECTIVES];
const STATE_VALUES: string[] = ACTIVITY_PREP_STATES.map((s) => s.value);
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Remet une saisie (formulaire, base) dans le cadre : valeur inconnue → vide, durée entière 1 à 600. */
export function cleanActivity(input: Partial<Record<keyof Activity, unknown>>): Activity {
  const minutes = Number(input.durationMinutes);
  const time = typeof input.startTime === "string" ? input.startTime.slice(0, 5) : "";
  return {
    durationMinutes:
      input.durationMinutes !== null &&
      input.durationMinutes !== "" &&
      Number.isInteger(minutes) &&
      minutes >= 1 &&
      minutes <= 600
        ? minutes
        : null,
    type: typeof input.type === "string" && TYPE_VALUES.includes(input.type) ? input.type : null,
    startTime: TIME.test(time) ? time : null,
    objective:
      typeof input.objective === "string" && OBJECTIVE_VALUES.includes(input.objective)
        ? input.objective
        : null,
    prepState:
      typeof input.prepState === "string" && STATE_VALUES.includes(input.prepState)
        ? (input.prepState as ActivityPrepState)
        : "not_started",
  };
}

export function activityTypeLabel(value: string | null): string | null {
  return ACTIVITY_TYPES.find((t) => t.value === value)?.label ?? null;
}

export function totalMinutes(activities: Pick<Activity, "durationMinutes">[]): number {
  return activities.reduce((sum, a) => sum + (a.durationMinutes ?? 0), 0);
}

/** « 45 min », « 2 h », « 1 h 30 ». */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export interface DurationCheck {
  status: "unknown" | "ok" | "short" | "over";
  message: string;
}

/** Total du déroulé contre la durée de la séance (une tolérance de 10 minutes compte pour « juste »). */
export function checkDuration(planned: number, sessionMinutes: number | null): DurationCheck {
  if (planned === 0) {
    return { status: "unknown", message: "Aucune durée estimée pour l’instant." };
  }
  if (!sessionMinutes) {
    return { status: "unknown", message: `Déroulé : ${formatMinutes(planned)}.` };
  }
  const gap = sessionMinutes - planned;
  if (Math.abs(gap) <= 10) {
    return {
      status: "ok",
      message: `Déroulé : ${formatMinutes(planned)} sur ${formatMinutes(sessionMinutes)} de séance.`,
    };
  }
  return gap > 0
    ? {
        status: "short",
        message: `Déroulé : ${formatMinutes(planned)} sur ${formatMinutes(sessionMinutes)} de séance, il reste ${formatMinutes(gap)}.`,
      }
    : {
        status: "over",
        message: `Déroulé : ${formatMinutes(planned)} sur ${formatMinutes(sessionMinutes)} de séance, ça dépasse de ${formatMinutes(-gap)}.`,
      };
}

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const toTime = (m: number) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/**
 * Horaire de début de chaque activité : celui qui est saisi, sinon la fin de la précédente (ou
 * l'heure de début de la séance pour la première). `null` quand on ne peut pas le déduire.
 */
export function startTimes(
  sessionStart: string | null,
  activities: Pick<Activity, "durationMinutes" | "startTime">[],
): (string | null)[] {
  let cursor: number | null =
    sessionStart && TIME.test(sessionStart.slice(0, 5)) ? toMinutes(sessionStart) : null;
  return activities.map((a) => {
    const start = a.startTime ? toMinutes(a.startTime) : cursor;
    cursor = start !== null && a.durationMinutes ? start + a.durationMinutes : null;
    return start === null ? null : toTime(start);
  });
}

/** « 08:30 · 45 min · Atelier · Analyser » : ce qui est connu de l'activité, ou `null` si rien. */
export function describeActivity(a: Activity, start: string | null): string | null {
  const parts = [
    start,
    a.durationMinutes ? formatMinutes(a.durationMinutes) : null,
    activityTypeLabel(a.type),
    a.objective,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
