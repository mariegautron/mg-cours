import type { ResourceFile } from "@/lib/resources/files";

/** Fichiers joints d'un sujet d'évaluation (US-90) : même forme que ceux d'une ressource. */
export type AssessmentFile = ResourceFile;

export const ASSESSMENT_FILES_BUCKET = "assessment-files";
export const ASSESSMENT_FILE_MAX_BYTES = 50 * 1024 * 1024;
export const ASSESSMENT_FILE_EXTENSIONS =
  /\.(pdf|docx?|odt|xlsx?|ods|pptx?|odp|png|jpe?g|gif|webp|html?|txt|md|zip)$/i;
export const ASSESSMENT_FILE_ACCEPT =
  ".pdf,.doc,.docx,.odt,.xls,.xlsx,.ods,.ppt,.pptx,.odp,.png,.jpg,.jpeg,.gif,.webp,.html,.htm,.txt,.md,.zip";

export function assessmentFileUrl(assessmentId: string, name: string) {
  return `/api/assessments/${assessmentId}/files/${encodeURIComponent(name)}`;
}

/** Nom de repli ASCII pour `filename=` (le vrai nom passe par `filename*`). */
function asciiName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
}

/**
 * En-têtes d'un fichier de sujet : toujours téléchargé, jamais interprété par le navigateur
 * (un .html fourni comme extrait de code ne doit pas s'exécuter sur notre origine).
 */
/** Types affichables en aperçu dans l'appli (jamais de SVG ni de HTML : du code pourrait s'y cacher). */
const PREVIEW_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

/**
 * En-têtes d'APERÇU d'un rendu (PDF ou image) dans les pages de l'appli : vrai type, `inline`,
 * encadrable seulement par l'appli elle-même. `null` pour tout autre type (téléchargement).
 */
export function previewHeaders(name: string, size?: number): Record<string, string> | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const type = PREVIEW_TYPES[ext];
  if (!type) return null;
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Content-Disposition": `inline; filename="${asciiName(name)}"`,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'",
    "Cache-Control": "private, no-store",
  };
  if (size !== undefined) headers["Content-Length"] = String(size);
  return headers;
}

export function downloadHeaders(name: string, size?: number): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename="${asciiName(name)}"; filename*=UTF-8''${encodeURIComponent(name).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'",
    "Cache-Control": "private, no-store",
  };
  if (size !== undefined) headers["Content-Length"] = String(size);
  return headers;
}
