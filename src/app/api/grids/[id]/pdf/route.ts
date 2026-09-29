import { renderToBuffer } from "@react-pdf/renderer";

import { buildGridHandout } from "@/lib/assessments/grid-handout";
import { getGrid } from "@/lib/assessments/queries";
import { GridHandoutDocument } from "@/lib/pdf/grid";

export const runtime = "nodejs";

/** Grille de correction seule, à remettre aux étudiant·es (sans notes ni commentaires). */
export async function GET(_req: Request, ctx: RouteContext<"/api/grids/[id]/pdf">) {
  const { id } = await ctx.params;
  const grid = await getGrid(id);
  if (!grid) return new Response("Grille introuvable", { status: 404 });

  const buffer = await renderToBuffer(GridHandoutDocument({ handout: buildGridHandout(grid) }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="grille.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
