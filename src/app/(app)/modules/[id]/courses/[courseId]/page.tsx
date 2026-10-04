import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Play, NotebookPen, Pencil } from "lucide-react";

import { Pill } from "@/components/dashboard/pill";
import { DownloadButton } from "@/components/download-button";
import { RetainedResources } from "@/components/modules/retained-resources";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { CourseOrderButtons } from "@/components/modules/course-order-buttons";
import { SessionList } from "@/components/modules/session-list";
import { SessionWorkspace, type WorkspaceResource } from "@/components/modules/session-workspace";
import { deleteCourseAndBack } from "@/app/(app)/modules/[id]/courses/workspace-actions";
import { listModuleAssessments } from "@/lib/assessments/queries";
import { getModulePlans } from "@/lib/modules/course-plan-queries";
import { getExpectationCourses } from "@/lib/modules/matching-queries";
import {
  getCourseResourcesFull,
  getModule,
  getModuleCourses,
  getModuleExpectations,
  getRetainedResources,
} from "@/lib/modules/queries";
import { checkPlannedHours, totalPlannedHours } from "@/lib/modules/course-duration";
import { EMPTY_ACTIVITY } from "@/lib/modules/activity";
import { getCourseActivities } from "@/lib/modules/activity-queries";
import { orderResources } from "@/lib/modules/session-builder";
import { formatSessionDay } from "@/lib/dashboard/today";
import { listQuestionLinks } from "@/lib/questions/link-queries";
import { slidePreviews } from "@/lib/resources/paste";
import { COMPLETION_LABELS } from "@/lib/notebook/notebook";
import { KIND_LABELS } from "@/lib/resources/kind";
import {
  hoursLabel,
  minutesBetween,
  neighbours,
  resourceSubtitle,
  uncoveredExpectations,
} from "@/lib/modules/workspace";

export const metadata: Metadata = { title: "Séance" };

const BTN =
  "focus-visible:ring-ring hover:bg-accent inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none";

export default async function CoursePage({
  params,
}: PageProps<"/modules/[id]/courses/[courseId]">) {
  const { id, courseId } = await params;
  const [
    mod,
    courses,
    fullResources,
    expectations,
    byExpectation,
    assessments,
    links,
    retained,
    activities,
  ] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    getCourseResourcesFull(courseId),
    getModuleExpectations(id),
    getExpectationCourses(id),
    listModuleAssessments(id),
    listQuestionLinks(),
    getRetainedResources(id),
    getCourseActivities(courseId),
  ]);
  const course = courses.find((c) => c.id === courseId);
  if (!mod || !course) notFound();
  const { available, plans } = await getModulePlans(courses.map((c) => c.id));
  const plan = plans.get(courseId);
  const { index, prev, next } = neighbours(courses, courseId);

  const ordered = orderResources(fullResources, plan?.resourceOrder);
  const workspaceResources: WorkspaceResource[] = ordered.map((r) => ({
    id: r.id,
    title: r.title,
    kindLabel: r.kind ? KIND_LABELS[r.kind] : "Ressource",
    ready: r.status === "ready",
    subtitle: resourceSubtitle({
      status: r.status,
      audience: r.audience,
      kind: r.kind,
      slideCount: r.content ? slidePreviews(r.content).length : 0,
    }),
    activity: activities.byResource.get(r.id) ?? EMPTY_ACTIVITY,
  }));

  const inSession = new Set(ordered.map((r) => r.id));
  const addable: WorkspaceResource[] = retained
    .filter((r) => !inSession.has(r.id))
    .map((r) => ({
      id: r.id,
      title: r.title,
      kindLabel: r.kind ? KIND_LABELS[r.kind] : "Ressource",
      ready: r.status === "ready",
      subtitle: resourceSubtitle({
        status: r.status,
        audience: r.audience,
        kind: r.kind,
        slideCount: 0,
      }),
      activity: EMPTY_ACTIVITY,
    }));

  const covered = expectations.filter((e) => (byExpectation.get(e.id) ?? []).includes(courseId));
  const missing = uncoveredExpectations(expectations, byExpectation);
  const linked = assessments.filter((a) => a.course_id === courseId && !a.makeup_of_id);
  const resourceIds = new Set(ordered.map((r) => r.id));
  const questionCount = new Set(
    links.pairs.filter((p) => resourceIds.has(p.resourceId)).map((p) => p.questionId),
  ).size;
  const hours = checkPlannedHours(totalPlannedHours(courses), mod.total_hours);
  const minutes = minutesBetween(course.start_time, course.end_time);
  const when = course.session_date
    ? `${formatSessionDay(course.session_date)}${course.start_time ? `, ${course.start_time.slice(0, 5)}–${course.end_time?.slice(0, 5) ?? ""}` : ""}${minutes ? ` (${hoursLabel(minutes)})` : ""}`
    : "date à fixer";

  return (
    <div className="flex flex-wrap items-stretch gap-4 lg:flex-nowrap">
      <SessionList
        moduleId={id}
        courses={courses}
        currentId={courseId}
        totalHours={mod.total_hours}
        missing={missing.map((e) => e.label)}
        hoursMessage={hours.consistent || totalPlannedHours(courses) === 0 ? null : hours.message}
      />

      <section aria-labelledby="ws" className="min-w-0 flex-1 basis-full space-y-3 lg:basis-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-[0.8rem]">
              Séance {index + 1} sur {courses.length} · {when}
            </p>
            <p className="text-primary mb-1 text-[0.75rem] font-bold tracking-widest uppercase">
              {mod.name}
            </p>
            <h1 id="ws" className="font-heading text-2xl font-bold">
              {course.title}
            </h1>
            {course.completion ? (
              <p className="mt-1">
                <Pill tone={course.completion === "done" ? "ok" : "warn"}>
                  {COMPLETION_LABELS[course.completion]}
                </Pill>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {prev ? (
              <Link href={`/modules/${id}/courses/${prev.id}`} className={BTN}>
                ← Séance {index}
              </Link>
            ) : null}
            {next ? (
              <Link href={`/modules/${id}/courses/${next.id}`} className={BTN}>
                Séance {index + 2} →
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/modules/${id}/courses/${courseId}/start`} className={BTN}>
            <Play aria-hidden className="mr-2 size-4" />
            Faire cours<span className="sr-only"> : {course.title}</span>
          </Link>
          <Link href={`/modules/${id}/courses/${courseId}/notebook`} className={BTN}>
            <NotebookPen aria-hidden className="mr-2 size-4" />
            Carnet<span className="sr-only"> de séance : {course.title}</span>
          </Link>
          <Link href={`/modules/${id}/courses/${courseId}/edit`} className={BTN}>
            <Pencil aria-hidden className="mr-2 size-4" />
            Modifier
            <span className="sr-only"> la séance {index + 1} (date, horaires, objectifs)</span>
          </Link>
          <CourseOrderButtons
            moduleId={id}
            courseId={courseId}
            title={course.title}
            index={index}
            total={courses.length}
          />
          <ConfirmDeleteButton
            itemName={`la séance ${index + 1}`}
            title={`Supprimer la séance ${index + 1} ?`}
            description="La séance et son déroulé sont supprimés. Les ressources restent dans la bibliothèque."
            onConfirm={deleteCourseAndBack.bind(null, id, courseId)}
          />
        </div>

        <SessionWorkspace
          key={courseId}
          moduleId={id}
          courseId={courseId}
          planAvailable={available}
          addable={addable}
          activitiesAvailable={activities.available}
          sessionMinutes={minutes}
          sessionStart={course.start_time ? course.start_time.slice(0, 5) : null}
          initial={{
            title: course.title,
            prepStatus: course.prep_status,
            deliverable: plan?.deliverable ?? "",
            resources: workspaceResources,
          }}
        />

        <details open className="bg-card rounded-3xl border p-4">
          <summary className="cursor-pointer font-semibold">
            Ressources retenues du module ({retained.length}) et cours en PDF
          </summary>
          <div className="mt-3 space-y-3">
            <RetainedResources moduleId={id} resources={retained} />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-sm">Cours en PDF pour Moodle :</span>
              <DownloadButton
                href={`/api/modules/${id}/courses`}
                doneLabel="Cours téléchargés (un seul PDF)."
              >
                Un seul PDF
              </DownloadButton>
              <DownloadButton
                href={`/api/modules/${id}/courses?format=zip`}
                kind="zip"
                doneLabel="Cours téléchargés (un PDF par séance)."
              >
                Un PDF par séance (zip)
              </DownloadButton>
            </div>
          </div>
        </details>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <Link href={`/modules/${id}`} className={BTN}>
            ← Retour au module
          </Link>
          {next ? (
            <Link
              href={`/modules/${id}/courses/${next.id}`}
              className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex min-h-11 items-center rounded-xl px-5 font-semibold shadow-lg focus-visible:ring-2 focus-visible:outline-none"
            >
              Séance suivante →
            </Link>
          ) : null}
        </div>
      </section>

      <aside
        className="w-full min-w-0 space-y-3 lg:w-72 lg:flex-none"
        aria-label="Autour de la séance"
      >
        <section aria-labelledby="at" className="bg-card rounded-3xl border p-4 shadow-sm">
          <h2 id="at" className="font-heading mb-1.5 text-base font-bold">
            Attendus traités
          </h2>
          {covered.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucun attendu relié à cette séance.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {covered.map((e) => (
                <li key={e.id}>
                  <Pill className="min-h-9 py-1.5 !whitespace-normal">{e.label}</Pill>
                </li>
              ))}
            </ul>
          )}
          <Link href={`/modules/${id}/matching`} className={`${BTN} mt-2`}>
            Ajouter un attendu
          </Link>
        </section>

        <section aria-labelledby="ev" className="bg-card rounded-3xl border p-4 shadow-sm">
          <h2 id="ev" className="font-heading mb-1 text-base font-bold">
            Évaluation liée
          </h2>
          {linked.length === 0 ? (
            <p className="text-muted-foreground text-sm">Aucune évaluation à cette séance.</p>
          ) : (
            linked.map((a) => (
              <div key={a.id} className="mb-2">
                <strong>{a.title}</strong>
                <p className="text-muted-foreground text-[0.8rem]">
                  {a.is_group_grade ? "Note de groupe" : "Note individuelle"}
                </p>
                <p className="my-1.5 flex flex-wrap gap-1.5">
                  <Pill tone={a.prep_status === "to_build" ? "warn" : "ok"}>
                    {a.prep_status === "to_build" ? "Sujet à construire" : "Sujet prêt"}
                  </Pill>
                  <Pill tone={a.grading_grid_id ? "ok" : "warn"}>
                    {a.grading_grid_id ? "Grille prête" : "Grille à créer"}
                  </Pill>
                </p>
                <Link href={`/modules/${id}/assessments/${a.id}`} className={BTN}>
                  Ouvrir l’évaluation<span className="sr-only"> : {a.title}</span>
                </Link>
              </div>
            ))
          )}
        </section>

        <section aria-labelledby="qz" className="bg-card rounded-3xl border p-4 shadow-sm">
          <h2 id="qz" className="font-heading mb-1 text-base font-bold">
            Quiz de fin de séance
          </h2>
          <p className="text-muted-foreground mb-2 text-sm">
            {links.available
              ? `${questionCount} question${questionCount > 1 ? "s" : ""} disponible${questionCount > 1 ? "s" : ""} dans les ressources de cette séance.`
              : "Les questions liées seront disponibles après la mise à jour de la base de données."}
          </p>
          <Link href="/questions" className={BTN}>
            Voir la banque de questions
          </Link>
        </section>
      </aside>
    </div>
  );
}
