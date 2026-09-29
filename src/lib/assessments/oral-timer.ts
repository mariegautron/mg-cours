/**
 * Chronomètre de l'oral (US-92). Le temps se calcule à partir d'horodatages, jamais en comptant les
 * ticks : un onglet en arrière-plan ne dérive pas. Fonctions pures.
 */

export interface TimerClock {
  /** Millisecondes déjà écoulées avant le dernier démarrage. */
  accumulatedMs: number;
  /** Horodatage du dernier démarrage, `null` en pause ou à l'arrêt. */
  startedAt: number | null;
}

export const INITIAL_CLOCK: TimerClock = { accumulatedMs: 0, startedAt: null };

export function startClock(clock: TimerClock, now: number): TimerClock {
  return clock.startedAt === null ? { ...clock, startedAt: now } : clock;
}

export function pauseClock(clock: TimerClock, now: number): TimerClock {
  return clock.startedAt === null
    ? clock
    : { accumulatedMs: clock.accumulatedMs + (now - clock.startedAt), startedAt: null };
}

export function elapsedMs(clock: TimerClock, now: number): number {
  return clock.accumulatedMs + (clock.startedAt === null ? 0 : Math.max(0, now - clock.startedAt));
}

/** Dernière minute : alerte visuelle et annoncée. */
export const WARNING_SECONDS = 60;

export type TimerPhase = "idle" | "running" | "paused" | "warning" | "over";

export interface TimerView {
  phase: TimerPhase;
  /** Secondes restantes (négatif après la fin). */
  remainingSeconds: number;
  /** Affichage « 12:05 » ; « +0:32 » une fois le temps dépassé. */
  label: string;
}

const clock2 = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function timerView(input: {
  durationSeconds: number;
  elapsedMs: number;
  running: boolean;
}): TimerView {
  // Arrondi au-dessus : « 0:01 » reste affiché jusqu'à la dernière milliseconde.
  const remainingSeconds = Math.ceil((input.durationSeconds * 1000 - input.elapsedMs) / 1000);
  const label = remainingSeconds >= 0 ? clock2(remainingSeconds) : `+${clock2(-remainingSeconds)}`;
  let phase: TimerPhase;
  if (remainingSeconds <= 0 && input.elapsedMs > 0) phase = "over";
  else if (input.elapsedMs === 0 && !input.running) phase = "idle";
  else if (remainingSeconds <= WARNING_SECONDS) phase = "warning";
  else phase = input.running ? "running" : "paused";
  return { phase, remainingSeconds, label };
}

export interface TimerAnnouncement {
  /** Annoncée quand il reste au plus autant de secondes. */
  atRemainingSeconds: number;
  message: string;
  /** « alert » : annonce assertive (dernière minute) ; sinon polie. */
  level: "polite" | "alert";
}

const minutesLabel = (m: number) => `${m} minute${m > 1 ? "s" : ""}`;

/**
 * Annonces d'un passage : à mi-parcours si le passage est long, à 5 minutes, à 1 minute (alerte) et à
 * la fin. Peu nombreuses et polies, pour ne pas couvrir la voix de qui présente.
 */
export function timerAnnouncements(durationSeconds: number): TimerAnnouncement[] {
  const list: TimerAnnouncement[] = [];
  if (durationSeconds >= 600) {
    list.push({
      atRemainingSeconds: 300,
      message: `Il reste ${minutesLabel(5)}.`,
      level: "polite",
    });
  }
  if (durationSeconds > 2 * WARNING_SECONDS) {
    list.push({
      atRemainingSeconds: WARNING_SECONDS,
      message: "Il reste une minute.",
      level: "alert",
    });
  }
  list.push({ atRemainingSeconds: 0, message: "Temps écoulé.", level: "polite" });
  return list;
}

/**
 * Annonces à faire maintenant : celles dont le seuil est franchi et qui n'ont pas déjà été dites.
 * Si plusieurs seuils sont franchis d'un coup (onglet réveillé), seule la plus proche est dite.
 */
export function dueAnnouncement(
  announcements: readonly TimerAnnouncement[],
  remainingSeconds: number,
  alreadySaid: ReadonlySet<number>,
): TimerAnnouncement | null {
  const due = announcements.filter(
    (a) => remainingSeconds <= a.atRemainingSeconds && !alreadySaid.has(a.atRemainingSeconds),
  );
  if (due.length === 0) return null;
  return due.reduce((best, a) => (a.atRemainingSeconds < best.atRemainingSeconds ? a : best));
}
