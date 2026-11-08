import { ASSESSMENT_FILES_BUCKET } from "@/lib/assessments/files";
import { safeDownloadName } from "@/lib/modules/espace";
import { callStudentView } from "@/lib/modules/student-public";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Document joint à une évaluation (template, énoncé annexe…) : servi UNIQUEMENT si le lien personnel est
 * valide ET si le fichier figure dans l'instantané publié. Le chemin vient de l'instantané, jamais de
 * l'adresse demandée ; téléchargement forcé, jamais interprété par le navigateur.
 */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/espace/[token]/evaluation-fichier/[n]/[name]">,
) {
  const { token, n, name } = await ctx.params;
  const res = await callStudentView(token, false);
  if (res.status !== "ok" || !res.content?.espace) {
    return new Response("Introuvable", { status: 404 });
  }
  let wanted = name;
  try {
    wanted = decodeURIComponent(name);
  } catch {
    /* gardé tel quel */
  }
  const evaluation = res.content.espace.evaluations[Number(n) - 1];
  const file = evaluation?.documents.find((f) => f.name === wanted);
  if (!file) return new Response("Introuvable", { status: 404 });
  const { data, error } = await createAdminClient()
    .storage.from(ASSESSMENT_FILES_BUCKET)
    .download(file.path);
  if (error || !data) return new Response("Introuvable", { status: 404 });
  return new Response(await data.arrayBuffer(), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeDownloadName(file.name)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "X-Robots-Tag": "noindex",
    },
  });
}
