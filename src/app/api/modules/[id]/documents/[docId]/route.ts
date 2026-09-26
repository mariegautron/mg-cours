import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/modules/[id]/documents/[docId]">) {
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

  return new Response(blob, {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
    },
  });
}
