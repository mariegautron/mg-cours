import { isOutlineSent, type IcebergState } from "./iceberg";

const DAY_MS = 24 * 60 * 60 * 1000;

/** date de dépôt obligatoire = 1re séance − 15 jours (règle YNOV). */
export function trameDueDate(firstSessionDate: string | Date): Date {
  const d = new Date(firstSessionDate);
  d.setUTCDate(d.getUTCDate() - 15);
  return d;
}

function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const b = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((b - a) / DAY_MS);
}

export type TrameAlertLevel = "sent" | "overdue" | "urgent" | "warning" | "ok" | "unknown";

export interface TrameStatus {
  dueDate: Date | null;
  /** Jours restants avant l'échéance (négatif = dépassée). `null` si pas de 1re séance. */
  daysUntilDue: number | null;
  level: TrameAlertLevel;
}

/**
 * Statut d'alerte de la trame pédagogique.
 * - `sent` : déjà envoyée (état iceberg ≥ outline_sent).
 * - `overdue` : échéance dépassée, non envoyée.
 * - `urgent` : ≤ 7 jours avant l'échéance (J-7).
 * - `warning` : ≤ 15 jours avant l'échéance (J-15).
 * - `ok` : plus de 15 jours devant soi.
 * - `unknown` : pas de date de 1re séance renseignée.
 */
export function trameStatus(
  firstSessionDate: string | Date | null,
  icebergState: IcebergState,
  today: Date = new Date(),
): TrameStatus {
  if (isOutlineSent(icebergState)) {
    return {
      dueDate: firstSessionDate ? trameDueDate(firstSessionDate) : null,
      daysUntilDue: null,
      level: "sent",
    };
  }
  if (!firstSessionDate) return { dueDate: null, daysUntilDue: null, level: "unknown" };

  const dueDate = trameDueDate(firstSessionDate);
  const daysUntilDue = daysBetween(today, dueDate);

  let level: TrameAlertLevel = "ok";
  if (daysUntilDue < 0) level = "overdue";
  else if (daysUntilDue <= 7) level = "urgent";
  else if (daysUntilDue <= 15) level = "warning";

  return { dueDate, daysUntilDue, level };
}
