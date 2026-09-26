import { parseResourceFiles, RESOURCE_FILES_BUCKET } from "@/lib/resources/files";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Durée de validité du lien signé (secondes). */
const SIGNED_URL_TTL = 300;

/**
 * Redirige vers un lien signé temporaire du fichier (bucket privé). Sert les images du contenu
 * Markdown (affichage) et les boutons Télécharger (`?download=1`).
 */
export async function GET(req: Request, ctx: RouteContext<"/api/resources/[id]/files/[name]">) {
  const { id, name } = await ctx.params;
  // Selon la version, `params` arrive décodé ou non : on accepte les deux formes.
  let decoded = name;
  try {
    decoded = decodeURIComponent(name);
  } catch {}
  const supabase = await createClient();
  const { data: resource } = await supabase
    .from("resource")
    .select("files")
    .eq("id", id)
    .maybeSingle();
  const file = parseResourceFiles(resource?.files).find(
    (f) => f.name === name || f.name === decoded,
  );
  if (!file) return new Response("Fichier introuvable", { status: 404 });

  const download = new URL(req.url).searchParams.has("download");
  const { data, error } = await supabase.storage
    .from(RESOURCE_FILES_BUCKET)
    .createSignedUrl(file.path, SIGNED_URL_TTL, download ? { download: file.name } : undefined);
  if (error || !data) return new Response("Fichier introuvable", { status: 404 });

  return new Response(null, {
    status: 302,
    headers: { Location: data.signedUrl, "Cache-Control": "private, no-store" },
  });
}
