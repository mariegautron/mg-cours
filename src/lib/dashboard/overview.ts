/**
 * Écran « Aujourd'hui » refait sur la maquette (DashSemaine / Aujourdhui) : fonctions pures pour
 * la frise de la semaine, les libellés de proximité et les indicateurs.
 */
import { daysBetween } from "./todo";
import type { WeekDay } from "./week";

export type DayState = "done" | "today" | "upcoming" | "empty";

export interface DayTile {
  label: string;
  day: number;
  state: DayState;
  isToday: boolean;
  /** « Séance 5 », « Séances 3 et 4 », « Aujourd'hui », vide sans séance. */
  caption: string;
  /** Symbole décoratif : ✓ fait, ● aujourd'hui, ▲ à venir (jamais seul : `caption` le dit en mots). */
  mark: string;
}

/** « Séance 5 », « Séances 3 et 4 », « Séances 2, 3 et 4 ». */
export function sessionsCaption(numbers: readonly number[]): string {
  const n = [...numbers].sort((a, b) => a - b).map(String);
  if (n.length === 0) return "";
  if (n.length === 1) return `Séance ${n[0]}`;
  return `Séances ${n.slice(0, -1).join(", ")} et ${n[n.length - 1]}`;
}

/**
 * Tuile d'un jour : passé avec séances = fait (✓), aujourd'hui = ●, à venir avec séances = ▲.
 * `isDone` dit si une séance du jour est faite (clôturée).
 */
export function dayTile<C extends { position: number }>(
  day: WeekDay<C>,
  today: string,
  isDone: (c: C) => boolean,
): DayTile {
  const numbers = day.courses.map((c) => c.position);
  const base = { label: day.label, day: day.day, isToday: day.isToday };
  if (day.isToday) {
    return { ...base, state: "today", mark: "●", caption: "Aujourd’hui" };
  }
  if (day.courses.length === 0) return { ...base, state: "empty", mark: "", caption: "" };
  if (day.date < today) {
    const done = day.courses.every(isDone);
    return {
      ...base,
      state: done ? "done" : "empty",
      mark: done ? "✓" : "",
      caption: sessionsCaption(numbers),
    };
  }
  return { ...base, state: "upcoming", mark: "▲", caption: sessionsCaption(numbers) };
}

/** « Dans 1 jour », « Demain » n'est pas utilisé : la maquette dit « Dans n jour(s) ». */
export function untilLabel(today: string, date: string): string {
  const n = daysBetween(today, date);
  if (n <= 0) return "Aujourd’hui";
  return `Dans ${n} jour${n > 1 ? "s" : ""}`;
}

/** Part en pourcentage, bornée à [0, 100] (barre de progression). */
export function percent(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

/** Moyenne de notes ramenées sur 20, une décimale à la française ; `null` sans note. */
export function meanLabel(valuesOn20: readonly number[]): string | null {
  if (valuesOn20.length === 0) return null;
  const mean = valuesOn20.reduce((a, b) => a + b, 0) / valuesOn20.length;
  return mean.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** « Séance 4 faite sur 6 » / « Séances 4 faites sur 6 ». */
export function progressLabel(done: number, total: number): string {
  return `Séance${done > 1 ? "s" : ""} ${done} faite${done > 1 ? "s" : ""} sur ${total}`;
}

/** Sous-titre de l'accueil : « Mercredi 4 novembre · pas de cours aujourd'hui, demain séance 5 ». */
export function dayLine(
  dayText: string,
  todayCount: number,
  next: { daysUntil: number; position: number } | null,
): string {
  if (todayCount > 0)
    return `${dayText} · ${todayCount} séance${todayCount > 1 ? "s" : ""} aujourd’hui`;
  if (!next) return `${dayText} · pas de cours aujourd’hui`;
  const when = next.daysUntil === 1 ? "demain" : `dans ${next.daysUntil} jours`;
  return `${dayText} · pas de cours aujourd’hui, ${when} séance ${next.position}`;
}
