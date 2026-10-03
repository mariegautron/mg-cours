import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { pickCourse } from "@/lib/modules/workspace";
import { todayInParis } from "@/lib/modules/next-session";
import { RetainedResources } from "@/components/modules/retained-resources";
import { getModule, getModuleCourses, getRetainedResources } from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Séances" };

/** Ouvre la séance utile (la prochaine datée, sinon la première à préparer) ; sans séance, propose d'en créer. */
export default async function ModuleCoursesPage({ params }: PageProps<"/modules/[id]/courses">) {
  const { id } = await params;
  const [mod, courses, retained] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    getRetainedResources(id),
  ]);
  if (!mod) notFound();
  const target = pickCourse(courses, todayInParis());
  if (target) redirect(`/modules/${id}/courses/${target.id}`);

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="font-heading text-2xl font-bold">Séances</h1>
      <EmptyState
        title="Aucune séance"
        description="Ajoute les dates du planning pour préparer chaque séance."
        actions={[
          { label: "Ajouter une séance", href: `/modules/${id}/courses/new` },
          { label: "Importer le planning", href: `/modules/${id}/schedule` },
        ]}
      />
      <RetainedResources moduleId={id} resources={retained} />
      <Link href={`/modules/${id}/import-courses`} className="text-sm underline underline-offset-2">
        Importer depuis un autre module
      </Link>
    </div>
  );
}
