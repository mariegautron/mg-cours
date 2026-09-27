import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { coverSlide, formatLongDate, listSlide, markdownSlides } from "@/components/present/deck";
import { PresentShell, type PresentSlide } from "@/components/present/present-shell";
import { listModuleAssessments } from "@/lib/assessments/queries";
import { getModule, getModuleCourses, getModuleResourcesFull } from "@/lib/modules/queries";
import { groupByKind, studentFacing } from "@/lib/resources/kind";
import { requiredNotes } from "@/lib/ynov/notation";

export async function generateMetadata({
  params,
}: PageProps<"/present/modules/[id]">): Promise<Metadata> {
  const { id } = await params;
  const mod = await getModule(id);
  return { title: mod ? `Présenter — ${mod.name}` : "Présentation du module" };
}

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

/** Présentation du module aux étudiant·es : accueil, programme, évaluation, ressources. */
export default async function PresentModulePage({ params }: PageProps<"/present/modules/[id]">) {
  const { id } = await params;
  const [mod, courses, assessments, allResources] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    listModuleAssessments(id),
    getModuleResourcesFull(id),
  ]);
  if (!mod) notFound();
  const resources = studentFacing(allResources);

  const sections: string[] = [];
  const slides: PresentSlide[] = [];
  const section = (label: string) => sections.push(label) - 1;

  const s0 = section("Accueil");
  slides.push(
    coverSlide(s0, {
      eyebrow: [mod.school?.name, mod.level, `${mod.year}-${mod.year + 1}`]
        .filter(Boolean)
        .join(" · "),
      title: mod.name,
      subtitle: `${mod.total_hours} h${mod.start_date ? ` · à partir du ${formatLongDate(mod.start_date)}` : ""}`,
    }),
  );
  if (mod.student_intro) slides.push(...markdownSlides(s0, mod.student_intro));

  if (courses.length) {
    const s = section("Programme");
    slides.push(
      listSlide(
        s,
        "Au programme",
        courses.map(
          (c, i) =>
            `Séance ${i + 1}${c.session_date ? ` (${shortDate(c.session_date)})` : ""} — ${c.title}`,
        ),
      ),
    );
    const objectives = Array.from(new Set(courses.flatMap((c) => c.learning_objectives)));
    if (objectives.length)
      slides.push(listSlide(s, "À la fin du module, vous saurez…", objectives));
  }

  const required = requiredNotes(mod.total_hours);
  if (assessments.length || required.total) {
    const s = section("Évaluation");
    const items = [...assessments]
      .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"))
      .map(
        (a) =>
          `${a.title} — ${a.is_group_grade ? "note de groupe" : "note individuelle"}${
            a.date ? `, ${shortDate(a.date)}` : ""
          }`,
      );
    if (required.total) {
      items.push(
        `Au moins ${required.total} notes : ${required.group} de groupe (coefficient 1) et ${required.individual} individuelle${required.individual > 1 ? "s" : ""} (coefficient 3).`,
      );
    }
    slides.push(listSlide(s, "Comment vous serez évalué·es", items));
  }

  if (resources.length) {
    const s = section("Ressources");
    for (const group of groupByKind(resources)) {
      slides.push(
        listSlide(
          s,
          `Ressources — ${group.label}`,
          group.items.map((r) => r.title),
        ),
      );
    }
  }

  return (
    <PresentShell
      title={`${mod.name} — présentation du module`}
      backHref={`/modules/${mod.id}`}
      backLabel="la fiche du module"
      sections={sections}
      slides={slides}
    />
  );
}
