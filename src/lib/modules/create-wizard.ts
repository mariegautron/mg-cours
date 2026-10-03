/**
 * Parcours « Créer le module » (2 étapes) : fonctions pures. Les séances viennent de l'export
 * Hyperplanning (créneaux fusionnés ou non) et/ou de lignes saisies à la main ; les dates, l'échéance
 * de la progression et le compte d'heures s'en déduisent.
 */
import { daysBetween } from "@/lib/dashboard/todo";
import type { HyperplanningSlot } from "./hyperplanning";
import { addDays, type ScheduleRow } from "./schedule-parser";

const rowKey = (r: ScheduleRow) => `${r.date} ${r.startTime ?? "99:99"}`;

/** Séances importées + lignes à la main, triées par date puis heure. */
export function mergePlanned(imported: ScheduleRow[], manual: ScheduleRow[]): ScheduleRow[] {
  return [...imported, ...manual].sort((a, b) => rowKey(a).localeCompare(rowKey(b)));
}

/** Combien de créneaux de l'export forment cette séance (0 pour une ligne saisie à la main). */
export function slotsInSession(session: ScheduleRow, slots: HyperplanningSlot[]): number {
  if (!session.startTime || !session.endTime) return 0;
  return slots.filter(
    (s) => s.date === session.date && s.start >= session.startTime! && s.start < session.endTime!,
  ).length;
}

export function originLabel(count: number): string {
  if (count === 0) return "Saisie à la main";
  if (count === 1) return "1 créneau";
  return `${count} créneaux fusionnés`;
}

export interface Deadline {
  /** Date ISO de l'échéance (J-15 avant la 1re séance). */
  date: string;
  /** Jours restants (négatif : dépassée). */
  daysLeft: number;
  tone: "ok" | "warn";
  label: string;
}

/** Échéance d'envoi de la progression ; `null` sans date de 1re séance. */
export function progressionDeadline(
  firstSessionDate: string | null,
  today: string,
): Deadline | null {
  if (!firstSessionDate) return null;
  const date = addDays(firstSessionDate, -15);
  const daysLeft = daysBetween(today, date);
  if (daysLeft < 0) {
    const n = -daysLeft;
    return { date, daysLeft, tone: "warn", label: `Dépassée de ${n} jour${n > 1 ? "s" : ""}` };
  }
  return {
    date,
    daysLeft,
    tone: "ok",
    label: daysLeft === 0 ? "C’est aujourd’hui" : `Dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}`,
  };
}

export interface HoursBalance {
  state: "none" | "ok" | "missing" | "extra";
  /** Écart en heures (planifié − prévu). */
  diff: number;
}

/** Compare les heures planifiées aux heures du module (tolérance d'une demi-heure). */
export function hoursBalance(plannedHours: number, moduleHours: number): HoursBalance {
  if (!(moduleHours > 0) || plannedHours <= 0) return { state: "none", diff: 0 };
  const diff = Math.round((plannedHours - moduleHours) * 100) / 100;
  if (Math.abs(diff) <= 0.5) return { state: "ok", diff };
  return { state: diff < 0 ? "missing" : "extra", diff };
}

/** Libellé du bouton final : « Créer le module et ses 6 séances ». */
export function createButtonLabel(sessionCount: number): string {
  if (sessionCount === 0) return "Créer le module";
  return `Créer le module et ${sessionCount > 1 ? `ses ${sessionCount} séances` : "sa séance"}`;
}
