import "server-only";

import sharp from "sharp";

import { RESOURCE_FILES_BUCKET, parseResourceFiles } from "@/lib/resources/files";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/db";

/** PNG et JPEG seulement (formats lus par le rendu PDF), 4 Mo au plus par image. */
const FORMATS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpeg" };
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Schémas à aplats : 1400 px de large au plus, PNG en palette (256 couleurs) ou JPEG à 75 %.
 * Si la recompression échoue ou n'allège pas, l'image d'origine est gardée.
 */
export async function compress(original: Buffer, mime: string): Promise<Buffer> {
  try {
    const resized = sharp(original).resize({ width: 1400, withoutEnlargement: true });
    const out =
      mime === "image/png"
        ? await resized.png({ palette: true, colours: 256, effort: 7 }).toBuffer()
        : await resized.jpeg({ quality: 75, mozjpeg: true }).toBuffer();
    return out.length < original.length ? out : original;
  } catch (error) {
    console.error("[export cours] recompression impossible", {
      message: error instanceof Error ? error.message : String(error),
    });
    return original;
  }
}

/**
 * Images des fiches pour le PDF : celles que le contenu référence, lues dans le bucket privé avec la
 * session de l'enseignante, rendues en URI de données (nom du fichier → image). Une image absente ou
 * trop lourde est simplement omise : le PDF garde alors sa légende.
 */
export async function loadResourceImages(
  resources: { id: string | null; content: string | null; files: Json | null }[],
): Promise<Map<string, Record<string, string>>> {
  const supabase = await createClient();
  const out = new Map<string, Record<string, string>>();
  await Promise.all(
    resources.map(async (r) => {
      if (!r.id || !r.content) return;
      const content = r.content;
      const wanted = parseResourceFiles(r.files).filter(
        (f) =>
          FORMATS[f.mime] &&
          f.size <= MAX_BYTES &&
          (content.includes(f.name) || content.includes(encodeURIComponent(f.name))),
      );
      const found: Record<string, string> = {};
      await Promise.all(
        wanted.map(async (f) => {
          try {
            const { data, error } = await supabase.storage
              .from(RESOURCE_FILES_BUCKET)
              .download(f.path);
            if (error || !data) return;
            const original = Buffer.from(await data.arrayBuffer());
            const bytes = await compress(original, f.mime);
            found[f.name] = `data:${f.mime};base64,${bytes.toString("base64")}`;
          } catch (error) {
            console.error("[export cours] image illisible", {
              resource: r.id,
              file: f.name,
              error,
            });
          }
        }),
      );
      if (Object.keys(found).length) out.set(r.id, found);
    }),
  );
  return out;
}
