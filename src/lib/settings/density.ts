export const DENSITIES = ["compact", "comfortable"] as const;
export type Density = (typeof DENSITIES)[number];

export const DENSITY_LABELS: Record<Density, string> = {
  compact: "Compacte",
  comfortable: "Confortable",
};

export const DENSITY_COOKIE = "density";

/** « Compacte » par défaut (corps 15 px) ; toute valeur inconnue y retombe. */
export function readDensity(value: unknown): Density {
  return DENSITIES.find((d) => d === value) ?? "compact";
}
