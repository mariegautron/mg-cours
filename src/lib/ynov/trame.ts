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

export type OutlineAlertLevel = Extract<TrameAlertLevel, "overdue" | "urgent" | "warning">;

export interface OutlineAlert<M> {
  module: M;
  level: OutlineAlertLevel;
  daysUntilDue: number;
}

const ALERT_LEVELS: readonly TrameAlertLevel[] = ["overdue", "urgent", "warning"];

/**
 * Progressions pédagogiques à surveiller (tableau de bord) : en retard, J-7 et J-15, triées de
 * la plus pressante à la moins pressante. Une liste vide = rien à signaler.
 */
export function outlineAlerts<
  M extends { first_session_date: string | null; iceberg_state: IcebergState },
>(modules: M[], today: Date = new Date()): OutlineAlert<M>[] {
  return modules
    .map((module) => ({
      module,
      status: trameStatus(module.first_session_date, module.iceberg_state, today),
    }))
    .filter(({ status }) => ALERT_LEVELS.includes(status.level))
    .map(({ module, status }) => ({
      module,
      level: status.level as OutlineAlertLevel,
      daysUntilDue: status.daysUntilDue ?? 0,
    }))
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

/** Résumé pour l'accroche du tableau de bord. */
export function outlineAlertSummary(
  alerts: OutlineAlert<unknown>[],
): "pressing" | "upcoming" | "none" {
  if (alerts.some((a) => a.level !== "warning")) return "pressing";
  return alerts.length ? "upcoming" : "none";
}

/** « 1 jour », « 12 jours » : l'accord réel, jamais « jour(s) ». */
export function daysLabel(n: number): string {
  const days = Math.abs(n);
  return `${days} jour${days > 1 ? "s" : ""}`;
}

/** « 1 autre », « 3 autres » (liste tronquée). */
export function othersLabel(n: number): string {
  return `${n} autre${n > 1 ? "s" : ""}`;
}

/**
 * Phrase d'état de la progression pédagogique (fiche module). J-7 = « urgent », J-15 =
 * « à préparer » : le message dit les jours restants, sans coller les deux repères.
 */
export function trameMessage(level: TrameAlertLevel, daysUntilDue: number | null): string {
  const days = daysUntilDue ?? 0;
  const until = days === 0 ? "aujourd’hui" : `dans ${daysLabel(days)}`;
  switch (level) {
    case "sent":
      return "Progression pédagogique envoyée.";
    case "overdue":
      return `Échéance dépassée depuis ${daysLabel(days)} — à envoyer sans attendre.`;
    case "urgent":
      return `Échéance ${until} — à envoyer rapidement.`;
    case "warning":
      return `Échéance ${until} — pense à la préparer.`;
    case "ok":
      return `Échéance ${until}.`;
    case "unknown":
      return "Renseigne la date de la 1re séance pour calculer l’échéance.";
  }
}

/** Humeur de la mascotte du tableau de bord : « alert » seulement à J-7 et en retard. */
export function alertMascotMood(
  summary: ReturnType<typeof outlineAlertSummary>,
): "happy" | "thinking" | "alert" {
  return summary === "pressing" ? "alert" : summary === "upcoming" ? "thinking" : "happy";
}
