import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Play } from "lucide-react";

import { Pill } from "@/components/dashboard/pill";
import { EmptyState } from "@/components/empty-state";
import { RetainedResources } from "@/components/modules/retained-resources";
import { getModule, getModuleCourses, getRetainedResources } from "@/lib/modules/queries";
import { sessionToTeach, todayInParis } from "@/lib/modules/next-session";
import { listStatus, sessionWhen } from "@/lib/modules/workspace";
import { cn } from "@/lib/utils";

const BTN =
  "focus-visible:ring-ring hover:bg-accent inline-flex min-h-11 items-center rounded-xl border px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none";

export const metadata: Metadata = { title: "Séances" };

/** Liste des séances du module (statut, horaires, séance à faire mise en avant) ; sans séance, propose d'en créer. */
export default async function ModuleCoursesPage({ params }: PageProps<"/modules/[id]/courses">) {
  const { id } = await params;
  const [mod, courses, retained] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    getRetainedResources(id),
  ]);
  if (!mod) notFound();
  if (courses.length > 0) {
    const today = todayInParis();
    const focus = sessionToTeach(courses, today);
    const focusIndex = focus ? courses.findIndex((c) => c.id === focus.id) : -1;
    return (
      <div className="max-w-3xl space-y-4">
        <h1 className="font-heading text-2xl font-bold">Séances</h1>
        {focus ? (
          <section
            aria-labelledby="next-session"
            className="bg-primary/15 border-primary/60 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
          >
            <div className="min-w-0">
              <h2
                id="next-session"
                className="text-primary text-xs font-bold tracking-widest uppercase"
              >
                {focus.session_date === today ? "Séance du jour" : "Prochaine séance"}
              </h2>
              <p className="font-semibold">
                Séance {focusIndex + 1} · {focus.title}
              </p>
              <p className="text-muted-foreground text-sm">
                {sessionWhen(focus.session_date, focus.start_time, focus.end_time)}
              </p>
            </div>
            <Link
              href={`/modules/${id}/courses/${focus.id}/start`}
              className={cn(BTN, "bg-primary text-primary-foreground hover:bg-primary/90")}
            >
              <Play aria-hidden className="mr-2 size-4" />
              Faire cours
              <span className="sr-only">
                {" "}
                : séance {focusIndex + 1}, {focus.title}
              </span>
            </Link>
          </section>
        ) : null}
        <p className="text-muted-foreground text-sm">Toutes les séances du module.</p>
        <ul className="divide-y rounded-xl border text-sm">
          {courses.map((c, i) => {
            const status = listStatus(c, today);
            const highlighted = c.id === focus?.id;
            return (
              <li key={c.id}>
                <Link
                  href={`/modules/${id}/courses/${c.id}`}
                  aria-current={highlighted ? "true" : undefined}
                  className={cn(
                    "flex min-h-11 flex-wrap items-center justify-between gap-2 px-4 py-2",
                    highlighted ? "bg-primary/15" : "hover:bg-accent",
                  )}
                >
                  <span className={cn("min-w-0", highlighted ? "font-bold" : "font-medium")}>
                    Séance {i + 1} · {c.title}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-3">
                    {sessionWhen(c.session_date, c.start_time, c.end_time)}
                    <Pill tone={status.tone} className="min-h-[22px] px-2 text-[0.75rem]">
                      {status.label}
                    </Pill>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Link href={`/modules/${id}/courses/new`} className={BTN}>
            Ajouter une séance
          </Link>
          <Link href={`/modules/${id}/schedule`} className={BTN}>
            Depuis un planning
          </Link>
          <Link href={`/modules/${id}/import-courses`} className={BTN}>
            Depuis un autre module
          </Link>
          <Link href={`/modules/${id}/planning`} className={BTN}>
            Planning du module
          </Link>
          <Link href={`/modules/${id}/frise`} className={BTN}>
            Frise du module
          </Link>
        </div>
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
