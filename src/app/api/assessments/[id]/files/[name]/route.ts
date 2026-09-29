import { ASSESSMENT_FILES_BUCKET, downloadHeaders } from "@/lib/assessments/files";
import { parseResourceFiles } from "@/lib/resources/files";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Télécharge un fichier du sujet d'une évaluation (bucket privé). Toujours en téléchargement forcé,
 * jamais affiché : un .html fourni comme extrait de code ne doit pas s'exécuter dans le navigateur.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/assessments/[id]/files/[name]">) {
  const { id, name } = await ctx.params;
  // Selon la version, `params` arrive décodé ou non : on accepte les deux formes.
  let decoded = name;
  try {
    decoded = decodeURIComponent(name);
  } catch {}
  const supabase = await createClient();
  const { data: assessment } = await supabase
    .from("assessment")
    .select("files")
    .eq("id", id)
    .maybeSingle();
  const file = parseResourceFiles(assessment?.files).find(
    (f) => f.name === name || f.name === decoded,
  );
  if (!file) return new Response("Fichier introuvable", { status: 404 });

  const { data, error } = await supabase.storage.from(ASSESSMENT_FILES_BUCKET).download(file.path);
  if (error || !data) return new Response("Fichier introuvable", { status: 404 });

  return new Response(data, { headers: downloadHeaders(file.name, data.size) });
}
