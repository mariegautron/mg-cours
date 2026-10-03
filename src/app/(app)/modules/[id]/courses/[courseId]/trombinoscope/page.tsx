import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EyeOff } from "lucide-react";

import { addObservation } from "@/app/(app)/modules/[id]/courses/[courseId]/notebook/actions";
import { Pill } from "@/components/dashboard/pill";
import { ObservationPanel, type StudentStat } from "@/components/notebook/observation-panel";
import { Button } from "@/components/ui/button";
import { getModule, getModuleCourses } from "@/lib/modules/queries";
import { notebookStudents } from "@/lib/notebook/notebook";
import { listCourseObservations, listModuleObservations } from "@/lib/notebook/queries";
import { listModuleGroups } from "@/lib/students/queries";

export const metadata: Metadata = { title: "Ma classe" };

/**
 * Trombinoscope de la séance (maquette « Trombinoscope ») : toute la classe en photos, avec le
 * nombre de notes et le groupe de chacun·e ; un clic ouvre la note. Vue privée, jamais projetée.
 */
export default async function ClassPage({
  params,
}: PageProps<"/modules/[id]/courses/[courseId]/trombinoscope">) {
  const { id, courseId } = await params;
  const [mod, courses, groups, moduleNotes, todayNotes] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    listModuleGroups(id),
    listModuleObservations(id),
    listCourseObservations(courseId),
  ]);
  const position = courses.findIndex((c) => c.id === courseId);
  if (!mod || position === -1) notFound();

  const students = notebookStudents(groups).map(({ id, first_name, last_name, photo_path }) => ({
    id,
    first_name,
    last_name,
    photo_path,
  }));
  const stats: Record<string, StudentStat> = {};
  for (const s of students) stats[s.id] = { total: 0, today: 0, group: null };
  for (const g of groups) {
    for (const m of g.members) if (stats[m.id] && !stats[m.id].group) stats[m.id].group = g.name;
  }
  for (const o of moduleNotes) if (stats[o.student_id]) stats[o.student_id].total += 1;
  for (const o of todayNotes) if (o.student && stats[o.student.id]) stats[o.student.id].today += 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Séance {position + 1} · Ma classe</h1>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <EyeOff aria-hidden className="size-4 shrink-0" />
            Vue privée : jamais projetée.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Pill tone="ok">
            {todayNotes.length} note{todayNotes.length > 1 ? "s" : ""} aujourd’hui
          </Pill>
          <Button asChild variant="ghost" size="touch">
            <Link href="/students/photos">Mettre à jour les photos</Link>
          </Button>
          <Button asChild variant="secondary" size="touch">
            <Link href={`/present/modules/${id}/courses/${courseId}/presenter`}>
              ← Retour au cours
            </Link>
          </Button>
        </div>
      </div>
      <ObservationPanel
        action={addObservation.bind(null, id, courseId)}
        students={students}
        stats={stats}
        defaultView="grid"
      />
      <p className="text-muted-foreground text-sm">
        Clique une photo pour noter la personne : le formulaire de note s’ouvre sous la grille
        (touches 1 à 5).
      </p>
    </div>
  );
}
