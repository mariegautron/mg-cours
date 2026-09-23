import { renderToBuffer } from "@react-pdf/renderer";

import { loadResultSheets } from "@/lib/assessments/results-data";
import { ResultsDocument } from "@/lib/pdf/results";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/modules/[id]/assessments/[assessmentId]/results">,
) {
  const { id, assessmentId } = await ctx.params;
  const sheets = await loadResultSheets(id, assessmentId);
  if (sheets === null) return new Response("Évaluation introuvable", { status: 404 });
  if (sheets.length === 0) return new Response("Aucune note saisie", { status: 409 });

  const buffer = await renderToBuffer(ResultsDocument({ sheets }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="resultats.pdf"',
    },
  });
}
