"use client";

import Link from "next/link";
import { CalendarDays, NotebookPen, Pencil, Play, Plus } from "lucide-react";

import { deleteCourse } from "@/app/(app)/modules/[id]/courses/actions";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { AudienceBadge, StatusBadge } from "@/components/resources/resource-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateDuration, formatDuration, formatTimeRange } from "@/lib/modules/course-duration";
import type { CourseWithResources } from "@/lib/modules/queries";
import { PREP_STATUS_LABELS, type PrepStatus } from "@/lib/modules/schema";
import { COMPLETION_LABELS, type CourseCompletion } from "@/lib/notebook/notebook";
import { groupByKind } from "@/lib/resources/kind";

const COURSE_TYPE_LABELS: Record<string, string> = {
  lecture: "Cours théorique",
  workshop: "Atelier / TP",
  project: "Projet",
  assessment: "Évaluation",
  demo: "Démonstration",
  applied: "Cours appliqué",
};

const PREP_VARIANT: Record<PrepStatus, "default" | "secondary" | "outline"> = {
  todo: "outline",
  in_progress: "secondary",
  ready: "default",
};

const COMPLETION_VARIANT: Record<CourseCompletion, "secondary" | "outline" | "destructive"> = {
  done: "secondary",
  partial: "outline",
  not_done: "destructive",
};

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function CourseList({
  moduleId,
  courses,
}: {
  moduleId: string;
  courses: CourseWithResources[];
}) {
  if (courses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="font-medium">Aucune séance pour l’instant</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Planifiez la première séance : elle alimente la progression pédagogique et les PDF Moodle.
        </p>
        <Button asChild size="sm" className="mt-3">
          <Link href={`/modules/${moduleId}/courses/new`}>
            <Plus aria-hidden />
            Planifier la première séance
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {courses.map((c, i) => (
        <li key={c.id} className="rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-sm">
                <span>Séance {i + 1}</span>
                {c.session_date ? (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays aria-hidden className="size-3.5" />
                    {formatDate(c.session_date)}
                    {c.start_time ? ` · ${formatTimeRange(c.start_time, c.end_time)}` : ""}
                    {calculateDuration(c.start_time, c.end_time)
                      ? ` (${formatDuration(calculateDuration(c.start_time, c.end_time))})`
                      : ""}
                  </span>
                ) : null}
              </p>
              <h3 className="font-medium">{c.title}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {c.completion ? (
                <Badge variant={COMPLETION_VARIANT[c.completion]}>
                  {COMPLETION_LABELS[c.completion]}
                </Badge>
              ) : null}
              <Badge variant={PREP_VARIANT[c.prep_status as PrepStatus] ?? "outline"}>
                {PREP_STATUS_LABELS[c.prep_status as PrepStatus] ?? c.prep_status}
              </Badge>
              <Badge variant="secondary">{COURSE_TYPE_LABELS[c.type] ?? c.type}</Badge>
              <Button asChild size="sm">
                <Link href={`/present/modules/${moduleId}/courses/${c.id}`}>
                  <Play aria-hidden />
                  Faire cours<span className="sr-only"> : {c.title}</span>
                </Link>
              </Button>
              <Button asChild size="sm" variant="secondary">
                <Link href={`/modules/${moduleId}/courses/${c.id}/notebook`}>
                  <NotebookPen aria-hidden />
                  Carnet<span className="sr-only"> de séance : {c.title}</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon">
                <Link
                  href={`/modules/${moduleId}/courses/${c.id}/edit`}
                  aria-label={`Modifier ${c.title}`}
                >
                  <Pencil aria-hidden />
                </Link>
              </Button>
              <ConfirmDeleteButton
                iconOnly
                itemName={c.title}
                title={`Supprimer la séance « ${c.title} » ?`}
                description="La séance et ses liens vers les ressources seront supprimés (les ressources elles-mêmes sont conservées)."
                onConfirm={() => deleteCourse(moduleId, c.id)}
              />
            </div>
          </div>

          {c.learning_objectives.length > 0 ? (
            <ul className="text-muted-foreground mt-2 list-inside list-disc text-sm">
              {c.learning_objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          ) : null}

          {c.resources.length > 0 ? (
            <dl className="mt-3 space-y-1 text-sm">
              {groupByKind(c.resources).map((group) => (
                <div key={group.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <dt className="text-muted-foreground w-24 shrink-0 text-xs">{group.label}</dt>
                  <dd className="flex flex-1 flex-wrap gap-1">
                    {group.items.map((r) => (
                      <Link
                        key={r.id}
                        href={`/resources/${r.id}`}
                        className="focus-visible:ring-ring inline-flex items-center gap-1 rounded-4xl focus-visible:ring-2 focus-visible:outline-none"
                      >
                        <Badge variant="outline">{r.title}</Badge>
                        <AudienceBadge audience={r.audience} />
                        <StatusBadge status={r.status} />
                      </Link>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <p className="text-muted-foreground mt-2 text-xs">
            Dernière mise à jour :{" "}
            {new Date(c.content_last_updated_at).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
        </li>
      ))}
    </ol>
  );
}
