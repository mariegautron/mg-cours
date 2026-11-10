import { CHECKPOINT_FILES_BUCKET } from "@/lib/checkpoints/checkpoints";
import { parseResourceFiles } from "@/lib/resources/files";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SIGNED_URL_TTL = 300;

/** Lien signé temporaire d'un fichier reçu pour un jalon (`id` = résultat), par son nom (`?name=`). */
export async function GET(req: Request, ctx: RouteContext<"/api/checkpoints/[id]/files">) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? "";
  const supabase = await createClient();
  const { data: result } = await supabase
    .from("checkpoint_result")
    .select("files")
    .eq("id", id)
    .maybeSingle();
  const file = parseResourceFiles(result?.files).find((f) => f.name === name);
  if (!file) return new Response("Fichier introuvable", { status: 404 });

  const download = url.searchParams.has("download");
  const { data, error } = await supabase.storage
    .from(CHECKPOINT_FILES_BUCKET)
    .createSignedUrl(file.path, SIGNED_URL_TTL, download ? { download: file.name } : undefined);
  if (error || !data) return new Response("Fichier introuvable", { status: 404 });

  return new Response(null, {
    status: 302,
    headers: { Location: data.signedUrl, "Cache-Control": "private, no-store" },
  });
}
