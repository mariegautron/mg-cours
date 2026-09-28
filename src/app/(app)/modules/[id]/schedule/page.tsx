import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { addScheduleToModule } from "@/app/(app)/modules/actions";
import { ScheduleForm } from "@/components/modules/schedule-form";
import { getModule, getModuleCourses } from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Planning du module" };

export default async function ModuleSchedulePage({ params }: PageProps<"/modules/[id]/schedule">) {
  const { id } = await params;
  const [mod, courses] = await Promise.all([getModule(id), getModuleCourses(id)]);
  if (!mod) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link href={`/modules/${mod.id}#courses`} className="text-sm underline underline-offset-2">
          ← {mod.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Ajouter des séances depuis un planning</h1>
        <p className="text-muted-foreground">
          {courses.length
            ? `Le module a déjà ${courses.length} séance${courses.length > 1 ? "s" : ""} : les nouvelles séances sont numérotées à leur suite.`
            : "Le module n’a pas encore de séance."}
        </p>
      </div>
      <ScheduleForm
        action={addScheduleToModule.bind(null, mod.id)}
        moduleId={mod.id}
        totalHours={mod.total_hours}
        existingCount={courses.length}
      />
    </div>
  );
}
