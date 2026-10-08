import { renderToBuffer } from "@react-pdf/renderer";
import { zipSync } from "fflate";

import { CourseDocument, ModuleCoursesDocument } from "@/lib/pdf/courses";
import { getCourseExport } from "@/lib/modules/queries";
import { loadResourceImages } from "@/lib/pdf/images";
import { getTeacherName } from "@/lib/outline/queries";

export const runtime = "nodejs";
// 25 fiches avec le rendu PDF dépassent la durée par défaut d'une fonction : on laisse le maximum
// du plan plutôt que de couper net (la coupure renvoie une page d'erreur, pas notre message).
export const maxDuration = 60;

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
  try {
    return await exportCourses(req, ctx);
  } catch (error) {
    // Visible dans les journaux de la fonction (Vercel → Logs) : module, format et cause.
    const { id } = await ctx.params;
    console.error("[export cours] échec", {
      moduleId: id,
      query: new URL(req.url).search,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    // La réponse n'est lue que par l'enseignante connectée : la cause s'affiche en ouvrant le lien.
    const cause = error instanceof Error ? error.message : String(error);
    return new Response(`Export impossible : ${cause.slice(0, 300)}`, { status: 500 });
  }
}

/** Limite de réponse d'une fonction Vercel : 4,5 Mo. Au-delà, mieux vaut le dire que laisser échouer. */
const MAX_RESPONSE_BYTES = 4.4 * 1024 * 1024;

function tooHeavy(bytes: number, kind: string) {
  console.error("[export cours] réponse trop lourde", { kind, bytes });
  return new Response(
    `Export trop lourd (${(bytes / 1024 / 1024).toFixed(1)} Mo) : la limite est de 4,5 Mo. Exporte un PDF par séance.`,
    { status: 413 },
  );
}

async function exportCourses(req: Request, ctx: RouteContext<"/api/modules/[id]/courses">) {
  const { id } = await ctx.params;
  const format = new URL(req.url).searchParams.get("format") === "zip" ? "zip" : "pdf";

  const [data, teacherName] = await Promise.all([getCourseExport(id), getTeacherName()]);
  if (!data) return new Response("Module introuvable", { status: 404 });
  if (data.courses.length === 0) return new Response("Aucune séance à exporter", { status: 404 });

  // Schémas des fiches (PNG/JPEG du bucket privé) : intégrés au PDF avec leur légende.
  const images = await loadResourceImages(data.courses.flatMap((c) => c.resources));
  for (const course of data.courses) {
    for (const r of course.resources) {
      (r as { images?: Record<string, string> }).images = (r.id && images.get(r.id)) || undefined;
    }
  }

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
    console.info("[export cours] pdf", { bytes: buffer.length, images: images.size });
    if (buffer.length > MAX_RESPONSE_BYTES) return tooHeavy(buffer.length, "pdf");
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
  const zipped = zipSync(files, { level: 0 });
  console.info("[export cours] zip", { bytes: zipped.length, images: images.size });
  if (zipped.length > MAX_RESPONSE_BYTES) return tooHeavy(zipped.length, "zip");
  return new Response(new Uint8Array(zipped), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="cours-${base}.zip"`,
    },
  });
}
