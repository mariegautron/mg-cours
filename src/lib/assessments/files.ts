import type { ResourceFile } from "@/lib/resources/files";

/** Fichiers joints d'un sujet d'évaluation (US-90) : même forme que ceux d'une ressource. */
export type AssessmentFile = ResourceFile;

export const ASSESSMENT_FILES_BUCKET = "assessment-files";
export const ASSESSMENT_FILE_MAX_BYTES = 50 * 1024 * 1024;
export const ASSESSMENT_FILE_EXTENSIONS =
  /\.(pdf|docx?|odt|pptx?|odp|png|jpe?g|gif|webp|html?|txt|zip)$/i;
export const ASSESSMENT_FILE_ACCEPT =
  ".pdf,.doc,.docx,.odt,.ppt,.pptx,.odp,.png,.jpg,.jpeg,.gif,.webp,.html,.htm,.txt,.zip";

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
