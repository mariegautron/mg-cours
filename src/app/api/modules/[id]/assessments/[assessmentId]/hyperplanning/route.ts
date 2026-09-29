import { hyperplanningCsv, hyperplanningRows } from "@/lib/assessments/hyperplanning";
import { loadResultSheets } from "@/lib/assessments/results-data";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/modules/[id]/assessments/[assessmentId]/hyperplanning">,
) {
  const { id, assessmentId } = await ctx.params;
  const sheets = await loadResultSheets(id, assessmentId);
  if (sheets === null) return new Response("Évaluation introuvable", { status: 404 });
  if (sheets.length === 0) return new Response("Aucune note saisie", { status: 409 });
  return new Response(hyperplanningCsv(hyperplanningRows(sheets)), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="notes-hyperplanning.csv"',
    },
  });
}
