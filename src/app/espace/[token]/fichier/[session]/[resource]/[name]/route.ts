import { callStudentView } from "@/lib/modules/student-public";
import { RESOURCE_FILES_BUCKET } from "@/lib/resources/files";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Image d'une fiche publiée : servie UNIQUEMENT si le lien personnel est valide ET si l'image figure
 * dans l'instantané publié. Le chemin vient de l'instantané, jamais de l'adresse demandée.
 */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/espace/[token]/fichier/[session]/[resource]/[name]">,
) {
  const { token, session, resource, name } = await ctx.params;
  const res = await callStudentView(token, false);
  if (res.status !== "ok" || !res.content?.espace) {
    return new Response("Introuvable", { status: 404 });
  }
  const course = res.content.espace.courses.find((c) => c.number === Number(session));
  let wanted = name;
  try {
    wanted = decodeURIComponent(name);
  } catch {
    /* gardé tel quel */
  }
  const file = course?.resources[Number(resource)]?.images.find((f) => f.name === wanted);
  if (!file) return new Response("Introuvable", { status: 404 });

  const { data, error } = await createAdminClient()
    .storage.from(RESOURCE_FILES_BUCKET)
    .download(file.path);
  if (error || !data) return new Response("Introuvable", { status: 404 });
  return new Response(await data.arrayBuffer(), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "private, max-age=300",
      "X-Robots-Tag": "noindex",
    },
  });
}
