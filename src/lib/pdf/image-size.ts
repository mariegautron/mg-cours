/** Zone utile d'une page A4 (595 × 842 pt) avec 40 pt de marge, moins de quoi laisser respirer une liste. */
export const IMAGE_MAX_WIDTH = 470;
export const IMAGE_MAX_HEIGHT = 520;

export interface PdfImage {
  /** URI de données (PNG ou JPEG). */
  src: string;
  /** Dimensions en points, toujours finies et dans la page : le rendu ne s'appuie jamais sur des pourcentages. */
  width: number;
  height: number;
}

/**
 * Taille d'une image dans la page : proportions gardées, jamais plus grande que la zone utile ni
 * que sa taille d'origine (1 px = 0,75 pt). Une dimension absente ou aberrante donne `null` : l'image
 * est alors remplacée par sa légende plutôt que de risquer une mise en page impossible.
 */
export function fitImage(
  pixelWidth: number | undefined,
  pixelHeight: number | undefined,
): { width: number; height: number } | null {
  if (
    !pixelWidth ||
    !pixelHeight ||
    !Number.isFinite(pixelWidth) ||
    !Number.isFinite(pixelHeight) ||
    pixelWidth < 1 ||
    pixelHeight < 1
  ) {
    return null;
  }
  const naturalW = pixelWidth * 0.75;
  const naturalH = pixelHeight * 0.75;
  const ratio = Math.min(1, IMAGE_MAX_WIDTH / naturalW, IMAGE_MAX_HEIGHT / naturalH);
  const width = Math.max(1, Math.round(naturalW * ratio));
  const height = Math.max(1, Math.round(naturalH * ratio));
  return Number.isFinite(width) && Number.isFinite(height) ? { width, height } : null;
}
