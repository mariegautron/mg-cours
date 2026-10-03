export const TEXT_SIZES = ["normal", "large", "xlarge"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];

export const TEXT_SIZE_LABELS: Record<TextSize, string> = {
  normal: "Texte normal",
  large: "Plus grand",
  xlarge: "Très grand",
};

export const TEXT_SIZE_COOKIE = "text-size";

/** Lit une valeur de cookie ou de formulaire ; toute valeur inconnue retombe sur « normal ». */
export function readTextSize(value: unknown): TextSize {
  return TEXT_SIZES.find((s) => s === value) ?? "normal";
}
