import { ASSESSMENT_FILES_BUCKET, downloadHeaders, previewHeaders } from "@/lib/assessments/files";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Fichier rendu (bucket privé, session requise). Téléchargement par défaut ; `?apercu=1` sert un
 * PDF ou une image en ligne pour l'aperçu de la correction (tout autre type reste téléchargé).
 */
export async function GET(
  req: Request,
  ctx: RouteContext<"/api/assessments/[id]/submissions/[itemId]">,
) {
  const { id, itemId } = await ctx.params;
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("submission_item")
    .select("storage_path, file_name")
    .eq("id", itemId)
    .eq("assessment_id", id)
    .eq("kind", "file")
    .maybeSingle();
  if (!item?.storage_path) return new Response("Fichier introuvable", { status: 404 });
  const { data, error } = await supabase.storage
    .from(ASSESSMENT_FILES_BUCKET)
    .download(item.storage_path);
  if (error || !data) return new Response("Fichier introuvable", { status: 404 });
  const name = item.file_name ?? "rendu";
  const preview =
    new URL(req.url).searchParams.get("apercu") === "1" ? previewHeaders(name, data.size) : null;
  return new Response(data, { headers: preview ?? downloadHeaders(name, data.size) });
}
