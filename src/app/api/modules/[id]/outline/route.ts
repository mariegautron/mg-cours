import { renderToBuffer } from "@react-pdf/renderer";

import { getOutline } from "@/lib/outline/queries";
import { OutlineDocument } from "@/lib/pdf/outline";
import type { OutlineContent } from "@/lib/ynov/outline";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: RouteContext<"/api/modules/[id]/outline">) {
  const { id } = await ctx.params;
  const outline = await getOutline(id);
  if (!outline) return new Response("Trame introuvable", { status: 404 });

  const content = outline.content as unknown as OutlineContent;
  const buffer = await renderToBuffer(OutlineDocument({ content }));

  const slug = content.moduleName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="progression-pedagogique-${slug}.pdf"`,
    },
  });
}
