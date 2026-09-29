import { renderToBuffer } from "@react-pdf/renderer";

import { buildGridHandout } from "@/lib/assessments/grid-handout";
import { getAssessment } from "@/lib/assessments/queries";
import { canPresent } from "@/lib/assessments/subject";
import { getModule } from "@/lib/modules/queries";
import { GridHandoutDocument } from "@/lib/pdf/grid";

export const runtime = "nodejs";

/** Grille d'une évaluation, à remettre aux étudiant·es (sans notes ni commentaires). */
export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/modules/[id]/assessments/[assessmentId]/grid">,
) {
  const { id, assessmentId } = await ctx.params;
  const [mod, assessment] = await Promise.all([getModule(id), getAssessment(assessmentId)]);
  if (!mod || !assessment || assessment.module_id !== id) {
    return new Response("Évaluation introuvable", { status: 404 });
  }
  if (!assessment.grading_grid) return new Response("Aucune grille choisie", { status: 409 });
  // Un sujet « à construire » n'est pas encore destiné aux étudiant·es.
  if (!canPresent(assessment.prep_status)) {
    return new Response("Sujet à construire : passez-le à « Prête » avant de l’exporter", {
      status: 409,
    });
  }

  const handout = buildGridHandout(assessment.grading_grid, {
    assessmentTitle: assessment.title,
    moduleName: mod.name,
    date: assessment.date,
    durationMinutes: assessment.duration_minutes,
    maxScore: assessment.max_score,
  });
  const buffer = await renderToBuffer(GridHandoutDocument({ handout }));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="grille-evaluation.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
