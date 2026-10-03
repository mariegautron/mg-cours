import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, CopyPlus, Play, Plus } from "lucide-react";

import { DownloadButton } from "@/components/download-button";
import { CourseList } from "@/components/modules/course-list";
import { RetainedResources } from "@/components/modules/retained-resources";
import { Button } from "@/components/ui/button";
import {
  checkPlannedHours,
  formatDuration,
  totalPlannedHours,
} from "@/lib/modules/course-duration";
import { highlightedSession, todayInParis } from "@/lib/modules/next-session";
import { getModule, getModuleCourses, getRetainedResources } from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Séances" };

export default async function ModuleCoursesPage({ params }: PageProps<"/modules/[id]/courses">) {
  const { id } = await params;
  const [mod, courses, retained] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    getRetainedResources(id),
  ]);
  if (!mod) notFound();

  const readyCourses = courses.filter((c) => c.prep_status === "ready").length;
  const toBuild = new Set(
    courses.flatMap((c) => c.resources.filter((r) => r.status === "progress").map((r) => r.id)),
  ).size;
  const plannedHours = totalPlannedHours(courses);
  const hoursCheck = checkPlannedHours(plannedHours, mod.total_hours);
  const upcoming = mod.archived_at ? null : highlightedSession(courses, todayInParis());

  return (
    <div className="max-w-5xl space-y-6">
      {upcoming ? (
        <section
          aria-labelledby="upcoming"
          className="bg-primary/15 border-primary/60 flex flex-wrap items-center justify-between gap-4 rounded-3xl border p-5"
        >
          <div>
            <h2 id="upcoming" className="text-primary text-sm font-bold">
              {upcoming.isToday ? "Séance du jour" : "Prochaine séance"}
            </h2>
            <p className="font-heading text-lg font-semibold">
              Séance {upcoming.number} — {upcoming.course.title}
            </p>
            {!upcoming.isToday && upcoming.course.session_date ? (
              <p className="text-muted-foreground text-sm">
                {new Date(`${upcoming.course.session_date}T00:00:00`).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            ) : null}
          </div>
          <Button asChild size="lg">
            <Link href={`/present/modules/${mod.id}/courses/${upcoming.course.id}`}>
              <Play aria-hidden />
              Faire cours
            </Link>
          </Button>
        </section>
      ) : null}
      <RetainedResources moduleId={mod.id} resources={retained} />
      <section aria-labelledby="courses">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 id="courses" className="font-heading text-2xl font-bold">
              Séances ({courses.length})
            </h1>
            {courses.length ? (
              <p className="text-muted-foreground text-sm">
                {readyCourses}/{courses.length} prête{readyCourses > 1 ? "s" : ""}
                {plannedHours > 0
                  ? ` · ${formatDuration(plannedHours)} planifiées / ${mod.total_hours} h`
                  : ""}
              </p>
            ) : null}
            {plannedHours > 0 && !hoursCheck.consistent ? (
              <p role="status" className="text-destructive text-sm">
                <span className="font-medium">À vérifier :</span> {hoursCheck.message}
              </p>
            ) : null}
            {toBuild > 0 ? (
              <p className="text-sm">
                {toBuild} ressource{toBuild > 1 ? "s" : ""} à construire dans ce module (jamais
                projetée{toBuild > 1 ? "s" : ""}).
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {courses.length ? (
              <Button asChild size="sm" variant="secondary">
                <Link href={`/modules/${mod.id}/build`}>Construire les séances</Link>
              </Button>
            ) : null}
            {courses.length ? (
              <Button asChild size="sm" variant="secondary">
                <Link href={`/modules/${mod.id}/frise`}>Frise du module</Link>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="secondary">
              <Link href={`/modules/${mod.id}/schedule`}>
                <CalendarPlus aria-hidden />
                Depuis un planning
              </Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/modules/${mod.id}/import-courses`}>
                <CopyPlus aria-hidden />
                Depuis un autre module
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/modules/${mod.id}/courses/new`}>
                <Plus aria-hidden />
                Ajouter une séance
              </Link>
            </Button>
          </div>
        </div>
        <CourseList
          moduleId={mod.id}
          courses={courses}
          highlightedId={upcoming?.course.id ?? null}
        />
        {courses.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">Cours en PDF pour Moodle :</span>
            <DownloadButton
              href={`/api/modules/${mod.id}/courses`}
              doneLabel="Cours téléchargés (un seul PDF)."
            >
              Un seul PDF
            </DownloadButton>
            <DownloadButton
              href={`/api/modules/${mod.id}/courses?format=zip`}
              kind="zip"
              doneLabel="Cours téléchargés (un PDF par séance)."
            >
              Un PDF par séance (zip)
            </DownloadButton>
          </div>
        ) : null}
      </section>
    </div>
  );
}
