import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Circle, CornerDownRight, TriangleAlert } from "lucide-react";

import {
  saveNextTime,
  undoCarryOverAction,
} from "@/app/(app)/modules/[id]/courses/[courseId]/notebook/actions";
import { DownloadButton } from "@/components/download-button";
import { NextTimeForm } from "@/components/notebook/next-time-form";
import { Button } from "@/components/ui/button";
import { loadCourseSubjects } from "@/lib/assessments/present-data";
import { ProjectionStatus } from "@/components/notebook/projection-status";
import { getCourseResourcesFull, getModule, getModuleCourses } from "@/lib/modules/queries";
import { projectionRecap } from "@/lib/notebook/projection";
import { listProjectionEvents } from "@/lib/notebook/projection-queries";
import { carryLabel, parseCarryOver } from "@/lib/present/carry-over";
import { keptForMeKeys, plannedSections } from "@/lib/present/plan";
import { studentFacing } from "@/lib/resources/kind";
import { listCourseObservations } from "@/lib/notebook/queries";
import { closureRecap, type RecapState } from "@/lib/notebook/recap";

export const metadata: Metadata = { title: "Séance clôturée" };

const STATE: Record<RecapState, { label: string; Icon: typeof Check; tone: string }> = {
  done: { label: "Fait", Icon: Check, tone: "bg-mint/20 text-mint" },
  partial: { label: "En partie", Icon: Circle, tone: "bg-sun/20 text-sun" },
  carried: { label: "Reporté", Icon: CornerDownRight, tone: "bg-sky/20 text-sky" },
  todo: { label: "À faire", Icon: TriangleAlert, tone: "bg-sun/20 text-sun" },
};

/**
 * Écran de fin de séance (US-137) : ce qui est fait, pas fait ou reporté (issu de la clôture), le
 * cours rédigé en PDF pour les étudiant·es, la consigne pour la prochaine fois, et la suite.
 */
export default async function ClosedCoursePage({
  params,
}: PageProps<"/modules/[id]/courses/[courseId]/closed">) {
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
  const next = courses[position + 1] ?? null;

  const projection = projectionRecap({
    planned: plannedSections(studentFacing(courseResources), subjects, keptForMeKeys(events)),
    events,
    isLastSession: !courses[position + 1],
    nextSessionResourceIds: (courses[position + 1]?.resources ?? []).map((r) => r.id),
  });
  const recap = closureRecap({
    completion: course.completion,
    notCovered: course.not_covered,
    nextTime: course.next_time,
    observedNames: observations.flatMap((o) =>
      o.student ? [`${o.student.first_name} ${o.student.last_name.charAt(0)}.`] : [],
    ),
    hasRetro: !!course.retro_note?.trim(),
    nextNumber: next ? position + 2 : null,
  });
  const carryState = parseCarryOver((course as { carried_over?: unknown }).carried_over);
  const moved = carryLabel(carryState.carried, (cid) => courses.findIndex((c) => c.id === cid) + 1);
  const when = course.session_date
    ? new Date(`${course.session_date}T00:00:00`).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : null;

  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-[3fr_2fr]">
      <section aria-labelledby="closed" className="bg-card space-y-4 rounded-2xl border p-6">
        <div>
          <h1 id="closed" className="font-heading text-3xl font-bold tracking-tight">
            Séance {position + 1} clôturée
          </h1>
          <p className="text-muted-foreground">
            {course.title} · {mod.name}
            {when ? ` · ${when}` : ""}
          </p>
        </div>
        <ul className="divide-y">
          {recap.map((item) => {
            const { label, Icon, tone } = STATE[item.state];
            return (
              <li key={item.key} className="flex items-start gap-3 py-3">
                <span
                  aria-hidden
                  className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${tone}`}
                >
                  <Icon className="size-3.5" />
                </span>
                <div>
                  <p className="font-medium">
                    <span className="sr-only">{label} : </span>
                    {item.title}
                  </p>
                  {item.detail ? (
                    <p className="text-muted-foreground text-sm">{item.detail}</p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        {projection.status !== "none" ? <ProjectionStatus recap={projection} /> : null}
        {moved.length || carryState.skipped.length ? (
          <section aria-labelledby="carried" className="space-y-2 rounded-xl border p-4">
            <h2 id="carried" className="font-medium">
              Reporté à la séance suivante
            </h2>
            <ul className="space-y-1 text-sm">
              {moved.map((m) => (
                <li key={m.title}>
                  <strong>{m.title}</strong>{" "}
                  <span className="text-muted-foreground">
                    {m.pending
                      ? "· en attente : il n’y a pas encore de séance suivante"
                      : m.alreadyThere
                        ? `· déjà dans la séance ${m.toNumber}`
                        : `· déplacé vers la séance ${m.toNumber}`}
                  </span>
                </li>
              ))}
              {carryState.skipped.map((x) => (
                <li key={x.key} className="text-muted-foreground">
                  {x.title} · pas fait volontairement, non reporté
                </li>
              ))}
            </ul>
            {moved.length ? (
              <form action={undoCarryOverAction.bind(null, id, courseId)}>
                <Button type="submit" variant="outline" size="touch">
                  Annuler le report
                </Button>
              </form>
            ) : null}
          </section>
        ) : null}
        <Button asChild variant="secondary" size="touch">
          <Link href={`/modules/${id}/courses/${courseId}/close`}>Modifier la clôture</Link>
        </Button>
      </section>

      <div className="space-y-4">
        <section aria-labelledby="after" className="bg-card space-y-3 rounded-2xl border p-5">
          <h2 id="after" className="font-heading text-xl font-semibold">
            Et maintenant ?
          </h2>
          <div className="flex flex-col gap-2">
            {next ? (
              <Button asChild size="touch">
                <Link href={`/modules/${id}/courses/${next.id}/start`}>
                  Préparer la séance {position + 2}
                  <span className="sr-only"> : {next.title}</span>
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="secondary" size="touch">
              <Link href={`/present/modules/${id}/courses/${courseId}`}>Reprendre le déroulé</Link>
            </Button>
            <Button asChild variant="outline" size="touch">
              <Link href="/dashboard">Retour à aujourd’hui</Link>
            </Button>
          </div>
        </section>

        <section aria-labelledby="pdf" className="bg-card space-y-3 rounded-2xl border p-5">
          <h2 id="pdf" className="font-heading text-xl font-semibold">
            Il reste à faire
          </h2>
          <p className="text-sm">
            <strong>Donner le cours rédigé</strong>
          </p>
          <p className="text-muted-foreground text-sm">
            Le PDF de cette séance pour les étudiant·es, à déposer sur Moodle. Il ne contient que
            les ressources qui leur sont destinées.
          </p>
          <DownloadButton
            href={`/api/modules/${id}/courses?number=${position + 1}`}
            doneLabel={`Cours de la séance ${position + 1} téléchargé.`}
            size="default"
          >
            Télécharger le cours rédigé (PDF)
          </DownloadButton>
        </section>

        <section aria-labelledby="next-time" className="bg-card space-y-3 rounded-2xl border p-5">
          <h2 id="next-time" className="font-heading text-xl font-semibold">
            Pour la prochaine fois
          </h2>
          {course.next_time?.trim() ? (
            // Déjà saisie à la clôture : on l'affiche, on ne la redemande pas.
            <>
              <p className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap">
                {course.next_time.trim()}
              </p>
              <details className="text-sm">
                <summary className="min-h-11 cursor-pointer py-2 font-medium underline underline-offset-2">
                  Modifier la consigne
                </summary>
                <div className="pt-2">
                  <NextTimeForm
                    action={saveNextTime.bind(null, id, courseId)}
                    value={course.next_time}
                  />
                </div>
              </details>
            </>
          ) : (
            <NextTimeForm action={saveNextTime.bind(null, id, courseId)} value="" />
          )}
        </section>
      </div>
    </div>
  );
}
