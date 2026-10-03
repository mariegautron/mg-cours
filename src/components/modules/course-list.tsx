"use client";

import { EmptyState } from "@/components/empty-state";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Ellipsis,
  NotebookPen,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";

import { deleteCourse, moveCourse } from "@/app/(app)/modules/[id]/courses/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AudienceBadge, StatusBadge } from "@/components/resources/resource-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { calculateDuration, formatDuration, formatTimeRange } from "@/lib/modules/course-duration";
import type { CourseWithResources } from "@/lib/modules/queries";
import type { MoveDirection } from "@/lib/modules/reorder";
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
  highlightedId = null,
}: {
  moduleId: string;
  courses: CourseWithResources[];
  /** Séance du jour (ou la prochaine) : la seule dont « Faire cours » est l'action principale. */
  highlightedId?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  // Suppression : un seul dialogue de confirmation pour toute la liste, ouvert depuis le menu « ⋯ ».
  const [deleting, setDeleting] = useState<CourseWithResources | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // Séance et sens à refocaliser une fois la liste réordonnée (le déplacement recrée le nœud).
  const focusAfter = useRef<{ id: string; direction: MoveDirection } | null>(null);
  const order = courses.map((c) => c.id).join(",");

  useEffect(() => {
    const target = focusAfter.current;
    if (!target) return;
    focusAfter.current = null;
    document.getElementById(`actions-${target.id}`)?.focus();
  }, [order]);

  const move = (course: CourseWithResources, direction: MoveDirection) => {
    focusAfter.current = { id: course.id, direction };
    startTransition(async () => {
      const result = await moveCourse(moduleId, course.id, direction);
      setAnnouncement(
        result.error ??
          `« ${course.title} » est maintenant la séance ${result.position} sur ${result.total}.`,
      );
    });
  };

  if (courses.length === 0) {
    return (
      <EmptyState
        compact
        title="Aucune séance"
        description="Ajoute les dates du planning pour préparer chaque séance."
        actions={[
          { label: "Planifier la première séance", href: `/modules/${moduleId}/courses/new` },
          { label: "Importer le planning", href: `/modules/${moduleId}/schedule` },
        ]}
      />
    );
  }

  return (
    <>
      <p role="status" className="sr-only">
        {announcement}
      </p>
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
                <Button
                  asChild
                  size="sm"
                  variant={c.id === highlightedId ? "default" : "secondary"}
                >
                  <Link href={`/modules/${moduleId}/courses/${c.id}/start`}>
                    <Play aria-hidden />
                    Faire cours<span className="sr-only"> : {c.title}</span>
                  </Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/modules/${moduleId}/courses/${c.id}/notebook`}>
                    <NotebookPen aria-hidden />
                    Carnet<span className="sr-only"> de séance : {c.title}</span>
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      id={`actions-${c.id}`}
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-busy={pending || undefined}
                      aria-label={`Actions de la séance ${i + 1} : ${c.title}`}
                    >
                      <Ellipsis aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/modules/${moduleId}/courses/${c.id}/edit`}>
                        <Pencil aria-hidden />
                        Modifier<span className="sr-only"> la séance {i + 1}</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={i === 0 || pending} onSelect={() => move(c, "up")}>
                      <ArrowUp aria-hidden />
                      Monter<span className="sr-only"> la séance {i + 1}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={i === courses.length - 1 || pending}
                      onSelect={() => move(c, "down")}
                    >
                      <ArrowDown aria-hidden />
                      Descendre<span className="sr-only"> la séance {i + 1}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(c)}>
                      <Trash2 aria-hidden />
                      Supprimer<span className="sr-only"> la séance {i + 1}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => (open ? null : setDeleting(null))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la séance « {deleting?.title} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              La séance et ses liens vers les ressources seront supprimés (les ressources
              elles-mêmes sont conservées).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const course = deleting;
                if (course)
                  startTransition(async () => void (await deleteCourse(moduleId, course.id)));
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
