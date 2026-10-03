import { ASSESSMENT_FILES_BUCKET, downloadHeaders } from "@/lib/assessments/files";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Télécharge un fichier rendu (bucket privé, session requise), jamais affiché dans le navigateur. */
export async function GET(
  _req: Request,
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
  return new Response(data, { headers: downloadHeaders(item.file_name ?? "rendu", data.size) });
}
