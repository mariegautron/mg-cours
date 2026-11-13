import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { sessionToTeach, todayInParis } from "@/lib/modules/next-session";
import { getModule, getModuleCourses } from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Séances" };

/** Ouvre la fiche de la séance à faire (du jour, sinon la prochaine, sinon la dernière) ; sans séance, propose d'en créer. */
export default async function ModuleCoursesPage({ params }: PageProps<"/modules/[id]/courses">) {
  const { id } = await params;
  const [mod, courses] = await Promise.all([getModule(id), getModuleCourses(id)]);
  if (!mod) notFound();
  if (courses.length > 0) {
    // La fiche d'une séance porte déjà la liste des séances et toutes les actions : pas de page liste.
    // Séance du jour, sinon la prochaine non clôturée, sinon la dernière du module.
    const target = sessionToTeach(courses, todayInParis()) ?? courses[courses.length - 1];
    redirect(`/modules/${id}/courses/${target.id}`);
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl">Séances</h1>
      <EmptyState
        title="Aucune séance"
        description="Ajoute les dates du planning pour préparer chaque séance."
        actions={[
          { label: "Ajouter une séance", href: `/modules/${id}/courses/new` },
          { label: "Importer le planning", href: `/modules/${id}/schedule` },
        ]}
      />
      <Link href={`/modules/${id}/import-courses`} className="text-sm underline underline-offset-2">
        Importer depuis un autre module
      </Link>
    </div>
  );
}
