import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EyeOff, Play } from "lucide-react";

import {
  addObservation,
  deleteObservation,
  saveCourseClosure,
} from "@/app/(app)/modules/[id]/courses/[courseId]/notebook/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ClosureForm } from "@/components/notebook/closure-form";
import { ObservationPanel } from "@/components/notebook/observation-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getModule, getModuleCourses } from "@/lib/modules/queries";
import { notebookStudents, OBSERVATION_TAG_LABELS } from "@/lib/notebook/notebook";
import { listCourseObservations } from "@/lib/notebook/queries";
import { listModuleGroups } from "@/lib/students/queries";

export const metadata: Metadata = { title: "Carnet de séance" };

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });

/**
 * Carnet de séance : vue privée à ouvrir sur le téléphone ou dans une 2e fenêtre, jamais
 * projetée. Observations sur les étudiant·es (US-65) et clôture de la séance (US-67).
 */
export default async function CourseNotebookPage({
  params,
}: PageProps<"/modules/[id]/courses/[courseId]/notebook">) {
  const { id, courseId } = await params;
  const [mod, courses, groups, observations] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    listModuleGroups(id),
    listCourseObservations(courseId),
  ]);
  const position = courses.findIndex((c) => c.id === courseId);
  if (!mod || position === -1) notFound();
  const course = courses[position];
  const previous = position > 0 ? courses[position - 1] : null;
  const carriedOver = previous
    ? [
        { label: "Points non traités, à reporter", text: previous.not_covered },
        { label: "Demandé pour aujourd’hui", text: previous.next_time },
        { label: "Retour d’expérience de la séance précédente", text: previous.retro_note },
      ].filter((n) => n.text?.trim())
    : [];
  const students = notebookStudents(groups).map(({ id, first_name, last_name, photo_path }) => ({
    id,
    first_name,
    last_name,
    photo_path,
  }));

  return (
    <div className="max-w-2xl space-y-8">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">
          <Link href={`/modules/${id}#courses`} className="underline underline-offset-2">
            {mod.name}
          </Link>{" "}
          · Séance {position + 1}
          {course.session_date
            ? ` · ${new Date(`${course.session_date}T00:00:00`).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}`
            : ""}
        </p>
        <h1 className="text-2xl font-semibold">Carnet — {course.title}</h1>
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <EyeOff aria-hidden className="size-4 shrink-0" />
          Vue privée : à ouvrir sur ton téléphone ou dans une 2e fenêtre, jamais au projecteur.
        </p>
        <Button asChild variant="secondary" size="touch">
          <a
            href={`/present/modules/${id}/courses/${courseId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Play aria-hidden />
            Ouvrir la présentation
            <span className="sr-only"> — s’ouvre dans un nouvel onglet</span>
          </a>
        </Button>
      </div>

      {previous && carriedOver.length ? (
        <section aria-labelledby="carried" className="space-y-3 rounded-lg border p-4">
          <h2 id="carried" className="text-lg font-medium">
            Reprise de la séance précédente
          </h2>
          <p className="text-muted-foreground text-sm">
            Séance {position} : {previous.title}
          </p>
          <dl className="space-y-3 text-sm">
            {carriedOver.map((n) => (
              <div key={n.label}>
                <dt className="font-medium">{n.label}</dt>
                <dd className="whitespace-pre-wrap">{n.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section aria-labelledby="observations" className="space-y-3">
        <h2 id="observations" className="text-lg font-medium">
          Observations
        </h2>
        <ObservationPanel action={addObservation.bind(null, id, courseId)} students={students} />

        <h3 className="pt-2 font-medium">Notées pendant cette séance ({observations.length})</h3>
        {observations.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune observation pour l’instant.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {observations.map((o) => {
              const name = o.student ? `${o.student.first_name} ${o.student.last_name}` : "—";
              return (
                <li
                  key={o.id}
                  className="flex items-start justify-between gap-2 rounded-lg border p-2"
                >
                  <div>
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">{time(o.created_at)}</span>
                      <span className="font-medium">{name}</span>
                      <Badge variant="outline">{OBSERVATION_TAG_LABELS[o.tag]}</Badge>
                    </p>
                    {o.note ? <p className="mt-1 whitespace-pre-wrap">{o.note}</p> : null}
                  </div>
                  <ConfirmDeleteButton
                    iconOnly
                    touch
                    itemName={`l’observation sur ${name} (${time(o.created_at)})`}
                    title="Supprimer cette observation ?"
                    description="Elle disparaîtra aussi du journal de la fiche étudiant·e."
                    onConfirm={deleteObservation.bind(null, id, courseId, o.id)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="closure" className="space-y-3 rounded-lg border p-4">
        <h2 id="closure" className="text-lg font-medium">
          Clôture de la séance
        </h2>
        <ClosureForm
          action={saveCourseClosure.bind(null, id, courseId)}
          course={{
            completion: course.completion,
            not_covered: course.not_covered,
            next_time: course.next_time,
            retro_note: course.retro_note,
          }}
        />
      </section>
    </div>
  );
}
