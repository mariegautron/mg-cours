import { ASSESSMENT_FILES_BUCKET, downloadHeaders } from "@/lib/assessments/files";
import { followUpForToken } from "@/lib/deposits/follow-up";
import { callStudentView } from "@/lib/modules/student-public";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Document d'un point d'étape, depuis l'espace personnel : servi seulement si le lien est valide,
 * l'évaluation publiée et le document rattaché à la personne ou à son groupe. Le chemin vient de la
 * base, jamais de l'adresse demandée.
 */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/espace/[token]/depot/[assessmentId]/[itemId]">,
) {
  const { token, assessmentId, itemId } = await ctx.params;
  const notFound = () => new Response("Introuvable", { status: 404 });
  const res = await callStudentView(token, false);
  if (res.status !== "ok" || !res.content?.espace?.evaluations.some((e) => e.id === assessmentId)) {
    return notFound();
  }
  const item = (await followUpForToken(token, [assessmentId]))[assessmentId]?.items.find(
    (i) => i.id === itemId && i.kind === "file",
  );
  if (!item?.path) return notFound();
  const { data, error } = await createAdminClient()
    .storage.from(ASSESSMENT_FILES_BUCKET)
    .download(item.path);
  if (error || !data) return notFound();
  return new Response(data, {
    headers: { ...downloadHeaders(item.name, data.size), "X-Robots-Tag": "noindex, nofollow" },
  });
}
