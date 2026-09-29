import { isQuestionType, QUESTION_TYPES, type QuestionType } from "@/lib/questions/types";
import type { DrawRule } from "@/lib/quiz/types";

export const RESULTS_MODES = ["never", "after_submit", "after_close"] as const;
export type ResultsMode = (typeof RESULTS_MODES)[number];

export const RESULTS_MODE_LABELS: Record<ResultsMode, string> = {
  never: "Jamais : l’étudiant·e ne voit ni note ni corrigé",
  after_submit: "Sa note dès qu’elle est corrigée, le corrigé une fois le QCM clôturé",
  after_close: "Note et corrigé une fois le QCM clôturé pour tout le monde",
};

export interface QuizConfig {
  title: string;
  instructions: string;
  durationMinutes: number | null;
  opensAt: string | null;
  closesAt: string | null;
  showResults: ResultsMode;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  rules: DrawRule[];
}

/** « 2026-10-12T09:30 » saisi à Paris → instant UTC ISO (gère l'heure d'été). `null` si vide ou illisible. */
export function parisLocalToIso(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  // Décalage de Paris à cet instant : on l'évalue deux fois pour rester juste autour du changement d'heure.
  const offsetAt = (t: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Paris",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date(t));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) - t;
  };
  let guess = asUtc - offsetAt(asUtc);
  guess = asUtc - offsetAt(guess);
  const date = new Date(guess);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Instant ISO → valeur `datetime-local` à Paris. */
export function isoToParisLocal(iso: string | null): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Paris",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
  return parts.replace(" ", "T");
}

interface RawRule {
  category?: unknown;
  tags?: unknown;
  types?: unknown;
  count?: unknown;
  pointsEach?: unknown;
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : Number.NaN;
};

export function rulesFromJson(json: string): DrawRule[] {
  let raw: unknown;
  try {
    raw = JSON.parse(json || "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return (raw as RawRule[]).map((r) => ({
    category: typeof r.category === "string" && r.category.trim() ? r.category.trim() : null,
    tags: Array.isArray(r.tags)
      ? r.tags
          .filter((t): t is string => typeof t === "string" && t.trim() !== "")
          .map((t) => t.trim())
      : [],
    types: Array.isArray(r.types)
      ? (r.types.filter((t) => isQuestionType(t)) as QuestionType[])
      : [],
    count: num(r.count),
    pointsEach: num(r.pointsEach),
  }));
}

/** Erreurs de configuration (tutoiement) ; vide si le QCM est valide. */
export function validateQuizConfig(c: QuizConfig): string[] {
  const errors: string[] = [];
  if (!c.title.trim()) errors.push("Donne un titre au QCM.");
  if (c.durationMinutes !== null && !(c.durationMinutes > 0 && c.durationMinutes <= 480))
    errors.push(
      "La durée doit être comprise entre 1 et 480 minutes (ou vide pour ne pas la limiter).",
    );
  if (c.opensAt && c.closesAt && new Date(c.closesAt) <= new Date(c.opensAt))
    errors.push("La fermeture doit venir après l’ouverture.");
  if (c.rules.length === 0) errors.push("Ajoute au moins une règle de tirage.");
  c.rules.forEach((r, i) => {
    if (!Number.isInteger(r.count) || r.count < 1 || r.count > 100)
      errors.push(`Règle ${i + 1} : le nombre de questions est un entier entre 1 et 100.`);
    if (!Number.isFinite(r.pointsEach) || r.pointsEach < 0)
      errors.push(`Règle ${i + 1} : les points par question sont un nombre positif ou nul.`);
  });
  return errors;
}

export { QUESTION_TYPES };
