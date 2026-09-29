/** Nature du fichier généré à la volée : pilote les libellés d'attente et de fin. */
export type DownloadKind = "pdf" | "zip" | "xml";

const PENDING_LABELS: Record<DownloadKind, string> = {
  pdf: "Préparation du PDF…",
  zip: "Préparation de l’archive…",
  xml: "Préparation du fichier…",
};

const DONE_LABELS: Record<DownloadKind, string> = {
  pdf: "PDF téléchargé.",
  zip: "Archive téléchargée.",
  xml: "Fichier téléchargé.",
};

const FAILED_LABELS: Record<DownloadKind, string> = {
  pdf: "On n’a pas pu préparer le PDF.",
  zip: "On n’a pas pu préparer l’archive.",
  xml: "On n’a pas pu préparer le fichier.",
};

export const downloadLabels = (kind: DownloadKind) => ({
  pending: PENDING_LABELS[kind],
  done: DONE_LABELS[kind],
  failed: FAILED_LABELS[kind],
});

/**
 * Nom du fichier annoncé par un en-tête `Content-Disposition` (`filename*=UTF-8''…` prioritaire,
 * puis `filename="…"`) ; `fallback` si l'en-tête est absent ou illisible.
 */
export function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const extended = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (extended) {
    try {
      const name = decodeURIComponent(extended[1].trim());
      if (name) return name;
    } catch {
      // Encodage invalide : on retombe sur le nom simple.
    }
  }
  const plain = /filename\s*=\s*"([^"]+)"|filename\s*=\s*([^;]+)/i.exec(header);
  const name = (plain?.[1] ?? plain?.[2] ?? "").trim();
  return name || fallback;
}
