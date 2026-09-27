import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: RouteContext<"/api/modules/[id]/documents/[docId]">) {
  const { id, docId } = await ctx.params;
  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("module_document")
    .select("path, name, mime")
    .eq("id", docId)
    .eq("module_id", id)
    .maybeSingle();
  if (!doc) return new Response("Document introuvable", { status: 404 });

  const { data: blob, error } = await supabase.storage.from("module-documents").download(doc.path);
  if (error || !blob) return new Response("Document introuvable", { status: 404 });

  // `?inline=1` : aperçu dans le navigateur (PDF uniquement), sinon téléchargement.
  const inline =
    new URL(req.url).searchParams.get("inline") === "1" && doc.mime === "application/pdf";
  return new Response(blob, {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
    },
  });
}
