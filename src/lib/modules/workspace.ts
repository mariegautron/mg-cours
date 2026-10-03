/**
 * Écran « Séances » refait sur la maquette (Seances) : liste étroite + séance ouverte. Fonctions
 * pures : libellés de la liste, durée, sous-titre d'une ressource du déroulé, navigation entre séances.
 */
import { PREP_STATUS_LABELS, type PrepStatus } from "@/lib/modules/schema";

/** « 12/10 · 08–12 h » ; vide sans date. */
export function listDateLine(
  date: string | null,
  start: string | null,
  end: string | null,
): string {
  if (!date) return "Date à fixer";
  const [, m, d] = date.split("-");
  const hour = (t: string) => {
    const [h, mm] = t.split(":");
    return mm && mm !== "00" ? `${Number(h)}:${mm}` : String(Number(h));
  };
  const range =
    start && end ? ` · ${hour(start)}–${hour(end)} h` : start ? ` · ${hour(start)} h` : "";
  return `${d}/${m}${range}`;
}

/** Durée en minutes entre deux « HH:MM[:SS] » ; `null` si absente ou incohérente. */
export function minutesBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const t = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const n = t(end) - t(start);
  return n > 0 ? n : null;
}

/** « 4 h », « 1 h 30 ». */
export function hoursLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export function statusLabel(status: string): string {
  return PREP_STATUS_LABELS[status as PrepStatus] ?? status;
}

export const STATUS_TONES: Record<string, "warn" | "wip" | "ok"> = {
  todo: "warn",
  in_progress: "wip",
  ready: "ok",
};

/** Séance précédente et suivante (liens « ← Séance 2 » / « Séance 4 → »). */
export function neighbours<T extends { id: string }>(
  list: readonly T[],
  id: string,
): { index: number; prev: T | null; next: T | null } {
  const index = list.findIndex((c) => c.id === id);
  return {
    index,
    prev: index > 0 ? list[index - 1] : null,
    next: index >= 0 && index < list.length - 1 ? list[index + 1] : null,
  };
}

/** Séance à ouvrir quand on arrive sur la liste : la prochaine datée, sinon la première à préparer, sinon la première. */
export function pickCourse<
  T extends { id: string; session_date: string | null; prep_status: string },
>(list: readonly T[], today: string): T | null {
  if (list.length === 0) return null;
  const upcoming = list
    .filter((c) => c.session_date && c.session_date >= today)
    .sort((a, b) => a.session_date!.localeCompare(b.session_date!))[0];
  return upcoming ?? list.find((c) => c.prep_status !== "ready") ?? list[0];
}

/** Sous-titre d'une ressource du déroulé : diapositives, corrigé, état. */
export function resourceSubtitle(r: {
  status: string;
  audience: string;
  kind: string | null;
  slideCount: number;
}): string {
  if (r.status !== "ready") return r.kind === "answer_key" ? "Corrigé à écrire" : "À construire";
  if (r.audience === "teacher") return "Pour toi seule";
  if (r.slideCount > 0) return `${r.slideCount} diapositive${r.slideCount > 1 ? "s" : ""}`;
  return "Prête";
}

/** Attendus de l'école sans séance : ceux qu'aucune séance ne couvre. */
export function uncoveredExpectations<E extends { id: string }>(
  expectations: readonly E[],
  coursesByExpectation: ReadonlyMap<string, readonly string[]>,
): E[] {
  return expectations.filter((e) => (coursesByExpectation.get(e.id) ?? []).length === 0);
}
