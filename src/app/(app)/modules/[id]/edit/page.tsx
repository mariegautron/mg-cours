import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { updateModule } from "@/app/(app)/modules/actions";
import { ModuleDangerZone } from "@/components/modules/module-danger-zone";
import { ModuleForm } from "@/components/modules/module-form";
import { listModuleAssessments } from "@/lib/assessments/queries";
import { experienceNotes } from "@/lib/modules/duplicate-evaluations";
import { getModule, getModuleCourses, listSchools } from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Modifier le module" };

export default async function EditModulePage({ params }: PageProps<"/modules/[id]/edit">) {
  const { id } = await params;
  const [mod, schools, courses, assessments] = await Promise.all([
    getModule(id),
    listSchools(),
    getModuleCourses(id),
    listModuleAssessments(id),
  ]);
  if (!mod) notFound();

  return (
    <div className="space-y-6">
      <h1>Modifier « {mod.name} »</h1>
      <ModuleForm action={updateModule.bind(null, id)} schools={schools} module={mod} />

      {/* Dupliquer et supprimer : une seule fois, ici (doublon D17). */}
      <section aria-labelledby="module-actions" className="space-y-4 border-t pt-6">
        <h2 id="module-actions" className="text-sm font-semibold">
          Dupliquer ou supprimer le module
        </h2>
        <ModuleDangerZone
          id={mod.id}
          name={mod.name}
          year={mod.year}
          assessmentExperience={experienceNotes(assessments)}
          experience={courses.flatMap((c, i) =>
            c.retro_note?.trim()
              ? [{ number: i + 1, title: c.title, text: c.retro_note.trim() }]
              : [],
          )}
        />
      </section>
    </div>
  );
}
