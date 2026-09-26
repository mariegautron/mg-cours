import { z } from "zod";

import type { Json } from "@/types/db";

/** Entrée de resource.files : le fichier lui-même est dans le bucket `resource-files`. */
export type ResourceFile = {
  path: string;
  name: string;
  size: number;
  mime: string;
};

export const RESOURCE_FILES_BUCKET = "resource-files";
export const RESOURCE_FILE_MAX_BYTES = 50 * 1024 * 1024;
export const RESOURCE_FILE_EXTENSIONS = /\.(pdf|docx?|odt|pptx?|odp|key|png|jpe?g|gif|webp)$/i;
export const RESOURCE_FILE_ACCEPT =
  ".pdf,.doc,.docx,.odt,.ppt,.pptx,.odp,.key,.png,.jpg,.jpeg,.gif,.webp";

const entry = z.object({
  path: z.string().min(1),
  name: z.string().min(1),
  size: z.number().nonnegative(),
  mime: z.string(),
});

/** Lit resource.files en ignorant les entrées mal formées. */
export function parseResourceFiles(json: Json | null | undefined): ResourceFile[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((item) => {
    const parsed = entry.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export function isImageMime(mime: string) {
  return /^image\/(png|jpeg|gif|webp)$/.test(mime);
}

/**
 * Ajoute un fichier. Le nom est unique par ressource (c'est lui que cite le Markdown) :
 * un fichier du même nom remplace l'ancien, dont le chemin est renvoyé pour le supprimer du stockage.
 */
export function upsertFile(
  files: ResourceFile[],
  file: ResourceFile,
): { files: ResourceFile[]; replacedPath?: string } {
  const previous = files.find((f) => f.name === file.name);
  return {
    files: [...files.filter((f) => f.name !== file.name), file],
    replacedPath: previous && previous.path !== file.path ? previous.path : undefined,
  };
}

export function resourceFileUrl(resourceId: string, name: string, download = false) {
  return `/api/resources/${resourceId}/files/${encodeURIComponent(name)}${download ? "?download=1" : ""}`;
}

/**
 * Source d'une image du contenu Markdown : une URL absolue est gardée telle quelle ; un chemin
 * relatif (ex. export Notion « Page%20titre/schema.png ») désigne un fichier de la ressource, par son nom.
 */
export function resolveImageSrc(resourceId: string, src: string): string {
  if (/^(https?:|data:image\/)/i.test(src)) return src;
  const last = src.split(/[?#]/)[0].split("/").pop() ?? "";
  let name = last;
  try {
    name = decodeURIComponent(last);
  } catch {
    // nom mal encodé : on le garde tel quel
  }
  return resourceFileUrl(resourceId, name);
}
