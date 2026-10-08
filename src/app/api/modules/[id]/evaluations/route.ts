import { renderToBuffer } from "@react-pdf/renderer";
import { zipSync } from "fflate";

import { buildGridHandout } from "@/lib/assessments/grid-handout";
import {
  exportableAssessments,
  isAssessmentPart,
  PART_FILES,
  qcmCorrectionThemes,
  subjectParts,
  type AssessmentPart,
} from "@/lib/assessments/export";
import { getAssessment, listModuleAssessments } from "@/lib/assessments/queries";
import { getModule } from "@/lib/modules/queries";
import { getTeacherName } from "@/lib/outline/queries";
import { QcmCorrectionDocument, SubjectDocument } from "@/lib/pdf/assessment-export";
import { GridHandoutDocument } from "@/lib/pdf/grid";
import { getQuizByAssessment, loadBank } from "@/lib/quiz/queries";

export const runtime = "nodejs";
export const maxDuration = 60;

function slug(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "evaluation"
  );
}

/**
 * Export « Évaluations formatives » pour Moodle. `?assessment=ID&part=subject|criteria|correction` :
 * un PDF ; `?assessment=ID` ou sans paramètre : les PDF en zip (un dossier par évaluation). Jamais de
 * note, de commentaire ni de contenu « enseignante » : seule la correction type (grille, QCM) sort.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/modules/[id]/evaluations">) {
  try {
    const { id } = await ctx.params;
    const params = new URL(req.url).searchParams;
    const [mod, list, teacherName] = await Promise.all([
      getModule(id),
      listModuleAssessments(id),
      getTeacherName(),
    ]);
    if (!mod) return new Response("Module introuvable", { status: 404 });

    const wanted = params.get("assessment");
    const selected = exportableAssessments(list).filter((a) => !wanted || a.id === wanted);
    if (selected.length === 0) {
      return new Response("Aucune évaluation prête à exporter", { status: 404 });
    }

    async function parts(
      assessmentId: string,
    ): Promise<Partial<Record<AssessmentPart, Uint8Array>>> {
      const a = await getAssessment(assessmentId);
      if (!a || a.module_id !== id) return {};
      const context = {
        moduleName: mod!.name,
        title: a.title,
        type: a.type,
        date: a.date,
        durationMinutes: a.duration_minutes,
        teacherName,
      };
      const out: Partial<Record<AssessmentPart, Uint8Array>> = {};
      const sections = subjectParts(a);
      if (sections.length) {
        out.subject = new Uint8Array(
          await renderToBuffer(
            SubjectDocument({
              context,
              sections: sections.map((s) => ({ heading: s.heading, text: s.text })),
            }),
          ),
        );
      }
      if (a.grading_grid) {
        const handout = buildGridHandout(a.grading_grid, {
          assessmentTitle: a.title,
          moduleName: mod!.name,
          date: a.date,
          durationMinutes: a.duration_minutes,
          maxScore: a.max_score,
        });
        out.criteria = new Uint8Array(await renderToBuffer(GridHandoutDocument({ handout })));
      }
      // Correction type : seulement quand elle existe (un QCM) ; jalons et oraux n'en ont pas.
      const quiz = await getQuizByAssessment(a.id);
      if (quiz) {
        const themes = qcmCorrectionThemes(await loadBank(quiz.id), quiz.rules);
        if (themes.length) {
          out.correction = new Uint8Array(
            await renderToBuffer(QcmCorrectionDocument({ context, themes })),
          );
        }
      }
      return out;
    }

    const part = params.get("part");
    if (wanted && isAssessmentPart(part)) {
      const file = (await parts(selected[0].id))[part];
      if (!file) {
        return new Response("Ce document n’existe pas pour cette évaluation", { status: 404 });
      }
      return new Response(new Uint8Array(file), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${slug(selected[0].title)}-${PART_FILES[part]}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const files: Record<string, Uint8Array> = {};
    for (const [i, a] of selected.entries()) {
      const folder = `${String(i + 1).padStart(2, "0")}-${slug(a.title)}`;
      const rendered = await parts(a.id);
      for (const [key, bytes] of Object.entries(rendered) as [AssessmentPart, Uint8Array][]) {
        files[wanted ? PART_FILES[key] : `${folder}/${PART_FILES[key]}`] = bytes;
      }
    }
    if (Object.keys(files).length === 0) {
      return new Response("Rien à exporter pour ces évaluations", { status: 404 });
    }
    return new Response(new Uint8Array(zipSync(files, { level: 0 })), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="evaluations-${slug(mod.name)}.zip"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[export évaluations] échec", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    const cause = error instanceof Error ? error.message : String(error);
    return new Response(`Export impossible : ${cause.slice(0, 300)}`, { status: 500 });
  }
}
