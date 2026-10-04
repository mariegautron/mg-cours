/**
 * Barème à bandes d'une note bonus de certification (ex. Opquast) : un score brut (0 à 1000) donne
 * une note sur 20 par bande entière inclusive. Fonctions pures.
 */

export interface ScaleBand {
  min: number;
  max: number;
  points: number;
}

/** Barème Opquast par défaut. Les bornes sont à confirmer avec l'école : le barème reste modifiable. */
export const OPQUAST_SCALE: ScaleBand[] = [
  { min: 0, max: 99, points: 2 },
  { min: 100, max: 199, points: 4 },
  { min: 200, max: 299, points: 5 },
  { min: 300, max: 399, points: 6 },
  { min: 400, max: 499, points: 7 },
  { min: 500, max: 549, points: 8 },
  { min: 550, max: 599, points: 9 },
  { min: 600, max: 649, points: 10 },
  { min: 650, max: 699, points: 11 },
  { min: 700, max: 749, points: 12 },
  { min: 750, max: 799, points: 13 },
  { min: 800, max: 849, points: 15 },
  { min: 850, max: 899, points: 17 },
  { min: 900, max: 938, points: 19 },
  { min: 939, max: 1000, points: 20 },
];

export const SCALE_MAX_POINTS = 20;

/** Relit un barème venu de la base (jsonb) ; `null` s'il n'a pas la forme attendue. */
export function parseScale(raw: unknown): ScaleBand[] | null {
  if (!Array.isArray(raw)) return null;
  const bands: ScaleBand[] = [];
  for (const b of raw) {
    const o = b as Record<string, unknown>;
    const { min, max, points } = o ?? {};
    if (
      typeof min !== "number" ||
      typeof max !== "number" ||
      typeof points !== "number" ||
      !Number.isFinite(min + max + points)
    ) {
      return null;
    }
    bands.push({ min, max, points });
  }
  return bands.length ? bands : null;
}

/**
 * Contrôle un barème saisi : bornes entières, min ≤ max, points entre 0 et 20, pas de chevauchement.
 * Renvoie un message clair (la première erreur) ou `null` si le barème est correct.
 */
export function validateScale(bands: ScaleBand[]): string | null {
  if (bands.length === 0) return "Le barème est vide : ajoute au moins une bande.";
  for (const [i, b] of bands.entries()) {
    const n = i + 1;
    if (![b.min, b.max].every(Number.isInteger))
      return `Bande ${n} : les bornes sont des nombres entiers.`;
    if (b.min < 0) return `Bande ${n} : le score minimum ne peut pas être négatif.`;
    if (b.min > b.max) return `Bande ${n} : le minimum dépasse le maximum.`;
    if (!Number.isFinite(b.points) || b.points < 0 || b.points > SCALE_MAX_POINTS) {
      return `Bande ${n} : les points vont de 0 à ${SCALE_MAX_POINTS}.`;
    }
  }
  const sorted = [...bands].sort((a, b) => a.min - b.min);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].min <= sorted[i - 1].max) {
      return `Les bandes ${sorted[i - 1].min}–${sorted[i - 1].max} et ${sorted[i].min}–${sorted[i].max} se chevauchent.`;
    }
  }
  return null;
}

export type ScaleResult =
  | { status: "ok"; points: number }
  /** Aucun score saisi : pas de note. */
  | { status: "none" }
  | { status: "error"; message: string };

/**
 * Note sur 20 pour un score brut. Score absent ou vide : pas de note. Score hors de toutes les
 * bandes : erreur claire (on ne devine pas). Le score 0 est un score, pas une absence.
 */
export function scaleToPoints(
  bands: ScaleBand[],
  raw: number | string | null | undefined,
): ScaleResult {
  if (raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "")) {
    return { status: "none" };
  }
  const score = typeof raw === "number" ? raw : Number(raw.replace(",", "."));
  if (!Number.isFinite(score)) return { status: "error", message: "Le score doit être un nombre." };
  if (!Number.isInteger(score))
    return { status: "error", message: "Le score est un nombre entier." };
  const band = bands.find((b) => score >= b.min && score <= b.max);
  if (!band) {
    const lo = Math.min(...bands.map((b) => b.min));
    const hi = Math.max(...bands.map((b) => b.max));
    return {
      status: "error",
      message: `Le score ${score} n’entre dans aucune bande du barème (de ${lo} à ${hi}).`,
    };
  }
  return { status: "ok", points: band.points };
}

/**
 * « Bonus certification : +1,3 point sur la moyenne » : l'effet réel de la note bonus (jamais
 * négatif). `null` sans note bonus ; effet nul : on dit que la moyenne n'est pas touchée.
 */
export function bonusLine(effect: number | null | undefined): string | null {
  if (effect === null || effect === undefined) return null;
  if (effect < 0.005) {
    return "Bonus certification : sans effet sur la moyenne (un bonus ne la baisse jamais).";
  }
  const text = effect.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  return `Bonus certification : +${text} point${effect >= 2 ? "s" : ""} sur la moyenne.`;
}
