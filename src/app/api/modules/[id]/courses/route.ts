import { renderToBuffer } from "@react-pdf/renderer";
import { zipSync } from "fflate";

import { CourseDocument, ModuleCoursesDocument } from "@/lib/pdf/courses";
import { getCourseExport } from "@/lib/modules/queries";
import { getTeacherName } from "@/lib/outline/queries";

export const runtime = "nodejs";

function slug(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "cours"
  );
}

/**
 * `?format=pdf` (défaut) : un seul PDF avec toutes les séances.
 * `?format=zip` : un PDF par séance dans une archive.
 * `?number=N` : le PDF de la seule séance N (écran de fin de séance).
 */
export async function GET(req: Request, ctx: RouteContext<"/api/modules/[id]/courses">) {
  const { id } = await ctx.params;
  const format = new URL(req.url).searchParams.get("format") === "zip" ? "zip" : "pdf";

  const [data, teacherName] = await Promise.all([getCourseExport(id), getTeacherName()]);
  if (!data) return new Response("Module introuvable", { status: 404 });
  if (data.courses.length === 0) return new Response("Aucune séance à exporter", { status: 404 });

  const mod = { ...data.module, teacherName };
  const base = slug(mod.name);

  const numberParam = new URL(req.url).searchParams.get("number");
  if (numberParam !== null) {
    const course = data.courses.find((c) => c.number === Number(numberParam));
    if (!course) return new Response("Séance introuvable", { status: 404 });
    const buffer = await renderToBuffer(CourseDocument({ mod, course }));
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cours-${base}-seance-${course.number}.pdf"`,
      },
    });
  }

  if (format === "pdf") {
    const buffer = await renderToBuffer(ModuleCoursesDocument({ mod, courses: data.courses }));
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cours-${base}.pdf"`,
      },
    });
  }

  const files: Record<string, Uint8Array> = {};
  for (const course of data.courses) {
    const buffer = await renderToBuffer(CourseDocument({ mod, course }));
    const name = `${String(course.number).padStart(2, "0")}-${slug(course.title)}.pdf`;
    files[name] = new Uint8Array(buffer);
  }
  return new Response(new Uint8Array(zipSync(files, { level: 0 })), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="cours-${base}.zip"`,
    },
  });
}
