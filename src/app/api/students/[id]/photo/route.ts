import { createClient } from "@/lib/supabase/server";
import { STUDENT_PHOTOS_BUCKET } from "@/lib/students/photo";

export const runtime = "nodejs";

/** Validité du lien signé (secondes) : juste le temps que le navigateur charge l'image. */
const SIGNED_URL_TTL = 60;

/**
 * US-66 : redirige vers un lien signé très court de la photo (bucket privé). L'URL de cette route
 * n'expose rien : elle exige la session de l'enseignante, et aucun lien signé n'est jamais écrit
 * dans une page, un export, un e-mail ou une présentation.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/students/[id]/photo">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: student } = await supabase
    .from("student")
    .select("photo_path")
    .eq("id", id)
    .maybeSingle();
  if (!student?.photo_path) return new Response("Photo introuvable", { status: 404 });

  const { data, error } = await supabase.storage
    .from(STUDENT_PHOTOS_BUCKET)
    .createSignedUrl(student.photo_path, SIGNED_URL_TTL);
  if (error || !data) return new Response("Photo introuvable", { status: 404 });

  return new Response(null, {
    status: 302,
    headers: { Location: data.signedUrl, "Cache-Control": "private, no-store" },
  });
}
