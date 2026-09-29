import { schoolYearLabel } from "./groups";

/**
 * US-80b : promotion par année scolaire. `year` = année de rentrée (2025 → « 2025-26 »).
 */

export interface StudentYear {
  year: number;
  scholar_group: string | null;
}

/** Année scolaire en cours : la rentrée est en août. */
export function currentSchoolYear(now: Date = new Date()): number {
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

/**
 * Années proposées dans les listes : les trois précédentes, l'en cours et la suivante, plus celles
 * déjà utilisées ; la plus récente en premier.
 */
export function schoolYearOptions(existing: number[] = [], now: Date = new Date()): number[] {
  const current = currentSchoolYear(now);
  const years = new Set([current - 3, current - 2, current - 1, current, current + 1, ...existing]);
  return [...years].sort((a, b) => b - a);
}

/** Lit « 2025-26 », « 2025/2026 » ou « 2025 » ; `null` sinon. */
export function parseSchoolYear(input: string): number | null {
  const m = /^\s*(20\d{2})(?:\s*[-/]\s*(\d{2}|\d{4}))?\s*$/.exec(input);
  if (!m) return null;
  const year = Number(m[1]);
  if (m[2]) {
    const end = m[2].length === 2 ? Math.floor(year / 100) * 100 + Number(m[2]) : Number(m[2]);
    if (end !== year + 1) return null;
  }
  return year;
}

/** Année la plus probable d'une promotion : celle des modules de ses groupes (la plus fréquente, à égalité la plus récente). */
export function mostLikelyYear(groupYears: number[], fallback: number): number {
  if (groupYears.length === 0) return fallback;
  const counts = new Map<number, number>();
  for (const y of groupYears) counts.set(y, (counts.get(y) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
}

/** Promotions avec libellé, la plus récente d'abord ; les années sans promotion sont ignorées. */
export function promotions(years: StudentYear[]): { year: number; label: string; group: string }[] {
  return years
    .filter((y): y is StudentYear & { scholar_group: string } => !!y.scholar_group?.trim())
    .sort((a, b) => b.year - a.year)
    .map((y) => ({ year: y.year, label: schoolYearLabel(y.year), group: y.scholar_group.trim() }));
}

/** Promotion à afficher : celle de l'année demandée, sinon la plus récente. */
export function promotionToShow(
  years: StudentYear[],
  year?: number,
): { year: number; label: string; group: string } | null {
  const all = promotions(years);
  if (year !== undefined) return all.find((p) => p.year === year) ?? null;
  return all[0] ?? null;
}
