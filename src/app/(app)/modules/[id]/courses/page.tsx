import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SessionList } from "@/components/modules/session-list";
import { checkPlannedHours, totalPlannedHours } from "@/lib/modules/course-duration";
import { getModule, getModuleCourses } from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Séances" };

/**
 * Séances › Liste (lot N2) : toutes les séances du module en pleine largeur, avec statut et date.
 * Plus de redirection automatique vers la séance du jour : Aujourd'hui garde son bouton direct.
 */
export default async function ModuleCoursesPage({ params }: PageProps<"/modules/[id]/courses">) {
  const { id } = await params;
  const [mod, courses] = await Promise.all([getModule(id), getModuleCourses(id)]);
  if (!mod) notFound();

  if (courses.length === 0) {
    return (
      <div className="max-w-3xl space-y-4">
        <h1>Séances</h1>
        <EmptyState
          title="Aucune séance"
          description="Ajoute les dates du planning pour préparer chaque séance."
          actions={[
            { label: "Ajouter une séance", href: `/modules/${id}/courses/new` },
            { label: "Importer des dates", href: `/modules/${id}/schedule` },
          ]}
        />
        <Link
          href={`/modules/${id}/import-courses`}
          className="text-sm underline-offset-2 hover:underline"
        >
          Importer depuis un autre module
        </Link>
      </div>
    );
  }

  const hours = checkPlannedHours(totalPlannedHours(courses), mod.total_hours);
  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader
        title="Séances"
        meta={
          <>
            <strong>{courses.length}</strong> séance{courses.length > 1 ? "s" : ""} ·{" "}
            <strong>{mod.total_hours} h</strong> prévues au module
          </>
        }
      />
      <SessionList
        layout="page"
        moduleId={id}
        courses={courses}
        currentId={null}
        totalHours={mod.total_hours}
        missing={[]}
        hoursMessage={hours.consistent || totalPlannedHours(courses) === 0 ? null : hours.message}
      />
    </div>
  );
}
