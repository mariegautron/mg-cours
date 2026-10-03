import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { saveCourseClosure } from "@/app/(app)/modules/[id]/courses/[courseId]/notebook/actions";
import { ClosureForm } from "@/components/notebook/closure-form";
import { ProjectionStatus } from "@/components/notebook/projection-status";
import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import { loadCourseSubjects } from "@/lib/assessments/present-data";
import { todayInParis } from "@/lib/modules/next-session";
import { getCourseResourcesFull, getModule, getModuleCourses } from "@/lib/modules/queries";
import { OBSERVATION_TAG_LABELS } from "@/lib/notebook/notebook";
import { endedEarly, projectionRecap } from "@/lib/notebook/projection";
import { listProjectionEvents } from "@/lib/notebook/projection-queries";
import { listCourseObservations } from "@/lib/notebook/queries";
import { keptForMeKeys, plannedSections } from "@/lib/present/plan";
import { minutesInParis } from "@/lib/present/sync";
import { studentFacing } from "@/lib/resources/kind";

export const metadata: Metadata = { title: "Clôturer la séance" };

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });

/**
 * Clôture de la séance (maquette « Cloture ») : quatre questions, deux minutes ; les notes du
 * jour et le relevé de la projection sont déjà là. Enregistre puis mène à l'écran de fin.
 */
export default async function CourseClosePage({
  params,
}: PageProps<"/modules/[id]/courses/[courseId]/close">) {
  const { id, courseId } = await params;
  const [mod, courses, observations, courseResources, subjects, events] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    listCourseObservations(courseId),
    getCourseResourcesFull(courseId),
    loadCourseSubjects(id, courseId),
    listProjectionEvents(courseId),
  ]);
  const position = courses.findIndex((c) => c.id === courseId);
  if (!mod || position === -1) notFound();
  const course = courses[position];
  const following = courses[position + 1] ?? null;
  const recap = projectionRecap({
    planned: plannedSections(studentFacing(courseResources), subjects, keptForMeKeys(events)),
    events,
    nextSessionResourceIds: (following?.resources ?? []).map((r) => r.id),
    endedEarly:
      course.session_date === todayInParis() && endedEarly(minutesInParis(), course.end_time),
  });
  const date = course.session_date
    ? new Date(`${course.session_date}T00:00:00`).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      })
    : null;

  const aside = (
    <>
      <section aria-labelledby="obs" className="bg-card space-y-3 rounded-xl border p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="obs" className="text-lg font-semibold">
            Ce que tu as noté aujourd’hui
          </h2>
          <Pill tone="ok">
            {observations.length} note{observations.length > 1 ? "s" : ""}
          </Pill>
        </div>
        {observations.length ? (
          <ul className="divide-y text-sm">
            {observations.map((o) => (
              <li key={o.id} className="flex flex-wrap justify-between gap-2 py-1.5">
                <span>
                  <strong>
                    {o.student ? `${o.student.first_name} ${o.student.last_name}` : "—"}
                  </strong>{" "}
                  · {OBSERVATION_TAG_LABELS[o.tag]}
                </span>
                <span className="text-muted-foreground">{time(o.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Aucune note prise pendant la séance.</p>
        )}
        <p className="text-muted-foreground text-xs">
          Elles sont déjà dans les fiches des étudiant·es. Rien à recopier.
        </p>
      </section>

      <section aria-labelledby="suite" className="bg-card space-y-2 rounded-xl border p-5">
        <h2 id="suite" className="text-lg font-semibold">
          Et ensuite ?
        </h2>
        {following ? (
          <>
            <p className="text-muted-foreground text-sm">
              Séance {position + 2} · {following.title}
            </p>
            <Button asChild variant="secondary" size="touch">
              <Link href={`/modules/${id}/courses/${following.id}/start`}>
                Préparer la séance {position + 2}
              </Link>
            </Button>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">C’était la dernière séance du module.</p>
        )}
      </section>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-muted-foreground text-sm">
          <Link href={`/modules/${id}/courses`} className="underline underline-offset-2">
            {mod.name}
          </Link>{" "}
          · Séance {position + 1}
        </p>
        <h1 className="text-3xl font-semibold">Clôturer la séance {position + 1}</h1>
        <p className="text-muted-foreground">
          {course.title}
          {date ? ` · ${date}` : ""} · quatre questions, deux minutes, tes notes sont déjà là.
        </p>
      </div>
      <ClosureForm
        action={saveCourseClosure.bind(null, id, courseId)}
        number={position + 1}
        suggestedNotCovered={recap.status === "late" ? recap.suggestedCarryOver : ""}
        recap={<ProjectionStatus recap={recap} />}
        aside={aside}
        backHref={`/present/modules/${id}/courses/${courseId}/presenter`}
        course={{
          completion: course.completion,
          not_covered: course.not_covered,
          next_time: course.next_time,
          retro_note: course.retro_note,
        }}
      />
    </div>
  );
}
