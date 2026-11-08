import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { pickCourse } from "@/lib/modules/workspace";
import { sessionToTeach, todayInParis } from "@/lib/modules/next-session";
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
  const today = todayInParis();
  // Séance du jour, sinon la prochaine à venir. Si toutes sont passées : vue d'ensemble, pas la dernière.
  const upcoming = courses.some((c) => c.session_date && c.session_date >= today);
  const target = sessionToTeach(courses, today) ?? (upcoming ? pickCourse(courses, today) : null);
  if (target) redirect(`/modules/${id}/courses/${target.id}`);

  if (courses.length > 0) {
    return (
      <div className="max-w-3xl space-y-4">
        <h1 className="font-heading text-2xl font-bold">Séances</h1>
        <p className="text-muted-foreground text-sm">
          Toutes les séances de ce module sont passées.
        </p>
        <ul className="divide-y rounded-xl border text-sm">
          {courses.map((c, i) => (
            <li key={c.id}>
              <Link
                href={`/modules/${id}/courses/${c.id}`}
                className="hover:bg-accent flex min-h-11 flex-wrap items-center justify-between gap-2 px-4 py-2"
              >
                <span className="font-medium">
                  Séance {i + 1} · {c.title}
                </span>
                <span className="text-muted-foreground">
                  {c.session_date
                    ? new Date(c.session_date).toLocaleDateString("fr-FR")
                    : "sans date"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

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
