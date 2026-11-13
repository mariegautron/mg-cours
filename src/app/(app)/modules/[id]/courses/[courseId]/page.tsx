import { isSubjectToBuild } from "@/lib/prep-status";
import type { Metadata } from "next";
import Link from "next/link";

import { CourseExpectationsPicker } from "@/components/modules/course-expectations-picker";
import { getExpectationLinks } from "@/lib/modules/expectation-links";
import { notFound } from "next/navigation";
import { ClipboardCheck, Play, Pencil } from "lucide-react";

import { Pill } from "@/components/dashboard/pill";
import { DisclosureMenu } from "@/components/ui/disclosure-menu";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { CourseOrderButtons } from "@/components/modules/course-order-buttons";
import { PruneEmptySessions } from "@/components/modules/prune-empty-sessions";
import { listEmptySessions } from "@/lib/modules/empty-sessions-queries";
import { resourceSlides } from "@/components/present/deck";
import { listSections, sectionChanges } from "@/lib/resources/sections";
import { SessionList } from "@/components/modules/session-list";
import { SessionWorkspace, type WorkspaceResource } from "@/components/modules/session-workspace";
import { deleteCourseAndBack } from "@/app/(app)/modules/[id]/courses/workspace-actions";
import { listModuleAssessments } from "@/lib/assessments/queries";
import { getModulePlans } from "@/lib/modules/course-plan-queries";
import { getExpectationCourses } from "@/lib/modules/matching-queries";
import {
  getCourseResourcesFull,
  loadSectionChoices,
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
  searchParams,
}: PageProps<"/modules/[id]/courses/[courseId]">) {
  const { id, courseId } = await params;
  const sp = await searchParams;
  const saved = sp.saved === "1";
  // Retour de « Créer une ressource » / « Enregistrer » ouverts depuis le déroulé.
  const added = sp.ajoutee === "1";
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
    rawResources,
    sectionChoices,
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
    getCourseResourcesFull(courseId, { raw: true }),
    loadSectionChoices([courseId]),
  ]);
  const rawById = new Map(rawResources.map((r) => [r.id, r]));
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
      // Même décompte que la fiche et la projection (page de titre comprise).
      slideCount: r.content ? resourceSlides(0, r).length : 0,
    }),
    activity: activities.byResource.get(r.id) ?? EMPTY_ACTIVITY,
    // Parties du cours (sections ##) : choix possible dès qu'il y en a au moins deux.
    parts: (() => {
      const raw = rawById.get(r.id)?.content ?? null;
      const sections = listSections(raw);
      if (sections.length < 2) return undefined;
      const choice = sectionChoices.get(`${courseId}|${r.id}`);
      const selected = choice?.selected ?? null;
      return { sections, selected, ...sectionChanges(raw, selected, choice?.known ?? null) };
    })(),
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
  // Attendus reliés aux ressources du déroulé : proposés (jamais cochés d'office).
  const expectationLinks = await getExpectationLinks(id);
  const suggestedExpectationIds = expectations
    .filter((e) => !covered.some((c) => c.id === e.id))
    .filter((e) =>
      [...(expectationLinks.byExpectation.get(e.id) ?? [])].some((r) => resourceIds.has(r)),
    )
    .map((e) => e.id);
  const questionCount = new Set(
    links.pairs.filter((p) => resourceIds.has(p.resourceId)).map((p) => p.questionId),
  ).size;
  const hours = checkPlannedHours(totalPlannedHours(courses), mod.total_hours);
  const minutes = minutesBetween(course.start_time, course.end_time);
  const when = course.session_date
    ? `${formatSessionDay(course.session_date)}${course.start_time ? `, ${course.start_time.slice(0, 5)}–${course.end_time?.slice(0, 5) ?? ""}` : ""}${minutes ? ` (${hoursLabel(minutes)})` : ""}`
    : "date à fixer";

  const emptySessions = await listEmptySessions(id);

  return (
    <div className="space-y-4">
      {/* Colonne de travail d'au moins 560 px : sous ~1 400 px utiles, la liste des séances passe
          en liste repliée en haut ; attendus, évaluation et quiz passent toujours sous la séance. */}
      <div className="min-[1680px]:hidden">
        <SessionList
          layout="drawer"
          moduleId={id}
          courses={courses}
          currentId={courseId}
          totalHours={mod.total_hours}
          missing={missing.map((e) => e.label)}
          hoursMessage={hours.consistent || totalPlannedHours(courses) === 0 ? null : hours.message}
        />
      </div>
      <div className="flex items-start gap-4">
        <div className="hidden min-[1680px]:block">
          <SessionList
            moduleId={id}
            courses={courses}
            currentId={courseId}
            totalHours={mod.total_hours}
            missing={missing.map((e) => e.label)}
            hoursMessage={
              hours.consistent || totalPlannedHours(courses) === 0 ? null : hours.message
            }
          />
        </div>

        <section aria-labelledby="ws" className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-muted-foreground text-[0.8125rem]">
                Séance {index + 1} sur {courses.length} · {when}
              </p>
              <p className="text-muted-foreground mb-1 text-[0.8125rem] font-medium">{mod.name}</p>
              <h1 id="ws">{course.title}</h1>
              {saved || added ? (
                <p role="status" className="text-mint text-sm font-semibold">
                  {added ? "Ressource ajoutée au déroulé." : "Enregistré."}
                </p>
              ) : null}
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

          {/* Une action principale (Faire cours), deux secondaires, le reste dans « Plus ». */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/modules/${id}/courses/${courseId}/start`}
              className="bg-primary text-primary-foreground hover:bg-primary/85 inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold"
            >
              <Play aria-hidden className="mr-2 size-4" />
              Faire cours<span className="sr-only"> : {course.title}</span>
            </Link>
            <Link href={`/modules/${id}/courses/${courseId}/edit`} className={BTN}>
              <Pencil aria-hidden className="mr-2 size-4" />
              Modifier
              <span className="sr-only"> la séance {index + 1} (date, horaires, objectifs)</span>
            </Link>
            {course.completion ? (
              <Link href={`/modules/${id}/courses/${courseId}/close`} className={BTN}>
                <ClipboardCheck aria-hidden className="mr-2 size-4" />
                Modifier la clôture
                <span className="sr-only"> de la séance {index + 1}</span>
              </Link>
            ) : null}
            <DisclosureMenu
              label="Plus"
              srLabel={`d’actions sur la séance ${index + 1}`}
              panelClassName="w-72 p-3"
            >
              <div className="flex flex-col items-start gap-2">
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
            </DisclosureMenu>
          </div>

          <SessionWorkspace
            key={courseId}
            moduleId={id}
            courseId={courseId}
            planAvailable={available}
            addable={addable}
            activitiesAvailable={activities.available}
            sessionMinutes={minutes}
            slidesUrl={course.slides_url ?? null}
            sessionStart={course.start_time ? course.start_time.slice(0, 5) : null}
            initial={{
              title: course.title,
              prepStatus: course.prep_status,
              deliverable: plan?.deliverable ?? "",
              resources: workspaceResources,
            }}
          />

          <div className="bg-card rounded-xl border p-4">
            <div className="space-y-3">
              <p className="text-muted-foreground text-sm">
                Les exports pour Moodle (cours en PDF, évaluations, progression) sont dans{" "}
                <Link
                  href={`/modules/${id}/documents#moodle`}
                  className="underline underline-offset-2"
                >
                  Documents
                </Link>
                .
              </p>
            </div>
          </div>
          <div
            className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3"
            role="group"
            aria-label="Autour de la séance"
          >
            <section aria-labelledby="at" className="bg-card rounded-xl border p-4">
              <h2 id="at" className="mb-1.5 text-sm font-semibold">
                Attendus traités
              </h2>
              <CourseExpectationsPicker
                moduleId={id}
                courseId={courseId}
                expectations={expectations.map((e) => ({ id: e.id, label: e.label }))}
                initial={covered.map((e) => e.id)}
                suggested={suggestedExpectationIds}
              />
            </section>

            <section aria-labelledby="ev" className="bg-card rounded-xl border p-4">
              <h2 id="ev" className="mb-1 text-sm font-semibold">
                Évaluation liée
              </h2>
              {linked.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucune évaluation à cette séance.</p>
              ) : (
                linked.map((a) => (
                  <div key={a.id} className="mb-2">
                    <strong>{a.title}</strong>
                    <p className="text-muted-foreground text-[0.8125rem]">
                      {a.is_group_grade ? "Note de groupe" : "Note individuelle"}
                    </p>
                    <p className="my-1.5 flex flex-wrap gap-1.5">
                      <Pill tone={isSubjectToBuild(a) ? "warn" : "ok"}>
                        {isSubjectToBuild(a) ? "Sujet à construire" : "Sujet prêt"}
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

            <section aria-labelledby="qz" className="bg-card rounded-xl border p-4">
              <h2 id="qz" className="mb-1 text-sm font-semibold">
                Quiz de fin de séance
              </h2>
              <p className="text-muted-foreground mb-1 text-sm">
                Les questions viennent des ressources du déroulé de cette séance.
              </p>
              <p role="status" className="mb-2 text-sm font-medium">
                {!links.available
                  ? "Les questions liées seront disponibles après la mise à jour de la base de données."
                  : ordered.length === 0
                    ? "0 ressource dans le déroulé."
                    : `${ordered.length} ressource${ordered.length > 1 ? "s" : ""}, ${questionCount} question${questionCount > 1 ? "s" : ""} liée${questionCount > 1 ? "s" : ""}.`}
              </p>
              <div className="flex flex-col gap-2">
                <Link href="#deroule" className={BTN}>
                  Ajouter une ressource au déroulé
                </Link>
                <Link href={`/modules/${id}/courses/${courseId}/questions`} className={BTN}>
                  Lier des questions aux ressources de cette séance
                </Link>
              </div>
            </section>
          </div>
        </section>
      </div>
      <PruneEmptySessions
        moduleId={id}
        sessions={emptySessions.map((c) => ({ id: c.id, title: c.title, position: c.position }))}
      />
    </div>
  );
}
