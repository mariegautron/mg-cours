import "server-only";

import { createClient } from "@/lib/supabase/server";

/** Limite de réponse d'une fonction Vercel : 4,5 Mo. Au-delà, le fichier passe par le stockage. */
export const MAX_DIRECT_BYTES = 4 * 1024 * 1024;

const SIGNED_SECONDS = 60;

/**
 * Livre un fichier généré. Petit : réponse directe. Lourd : dépôt dans le bucket privé `exports`
 * (un fichier par module et par type, écrasé à chaque fois) puis réponse JSON `{ url }` avec une URL
 * signée courte que le bouton suit. Sans bucket (migration pas encore appliquée) ou en cas d'échec
 * du dépôt, on renvoie le fichier si c'est encore possible, sinon un message clair.
 */
export async function deliverExport({
  bytes,
  contentType,
  filename,
  moduleId,
  kind,
}: {
  bytes: Uint8Array;
  contentType: "application/pdf" | "application/zip";
  filename: string;
  moduleId: string;
  /** Distingue les exports d'un même module (`cours-pdf`, `cours-zip`, `evaluations-zip`…). */
  kind: string;
}): Promise<Response> {
  const direct = () =>
    new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  console.info("[export] fichier prêt", { kind, bytes: bytes.length });
  if (bytes.length <= MAX_DIRECT_BYTES) return direct();

  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("session absente");
    const path = `${auth.user.id}/${moduleId}-${kind}.${contentType === "application/zip" ? "zip" : "pdf"}`;
    const bucket = supabase.storage.from("exports");
    const { error: uploadError } = await bucket.upload(path, bytes, { contentType, upsert: true });
    if (uploadError) throw uploadError;
    const { data, error } = await bucket.createSignedUrl(path, SIGNED_SECONDS, {
      download: filename,
    });
    if (error || !data) throw error ?? new Error("URL signée absente");
    return Response.json({ url: data.signedUrl, filename, bytes: bytes.length });
  } catch (error) {
    console.error("[export] dépôt impossible", {
      kind,
      bytes: bytes.length,
      message: error instanceof Error ? error.message : String(error),
    });
    return new Response(
      `Export trop lourd (${(bytes.length / 1024 / 1024).toFixed(1)} Mo) et le dépôt de fichiers n’est pas disponible : applique la migration « exports » ou exporte séance par séance.`,
      { status: 413 },
    );
  }
}
