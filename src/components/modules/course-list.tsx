"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";

import { deleteCourse } from "@/app/(app)/modules/[id]/courses/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CourseWithResources } from "@/lib/modules/queries";

const COURSE_TYPE_LABELS: Record<string, string> = {
  lecture: "Cours théorique",
  workshop: "Atelier / TP",
  project: "Projet",
  assessment: "Évaluation",
  demo: "Démonstration",
  applied: "Cours appliqué",
};

export function CourseList({
  moduleId,
  courses,
}: {
  moduleId: string;
  courses: CourseWithResources[];
}) {
  const [pending, startTransition] = useTransition();

  if (courses.length === 0) {
    return <p className="text-muted-foreground text-sm">Aucune séance pour l’instant.</p>;
  }

  return (
    <ol className="space-y-3">
      {courses.map((c, i) => (
        <li key={c.id} className="rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-muted-foreground text-sm">Séance {i + 1}</p>
              <h3 className="font-medium">{c.title}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{COURSE_TYPE_LABELS[c.type] ?? c.type}</Badge>
              <Button asChild variant="ghost" size="icon">
                <Link
                  href={`/modules/${moduleId}/courses/${c.id}/edit`}
                  aria-label={`Modifier ${c.title}`}
                >
                  <Pencil aria-hidden />
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={pending}
                aria-label={`Supprimer ${c.title}`}
                onClick={() => startTransition(() => void deleteCourse(moduleId, c.id))}
              >
                <Trash2 aria-hidden />
              </Button>
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
            <div className="mt-2 flex flex-wrap gap-1">
              {c.resources.map((r) => (
                <Link key={r.id} href={`/resources/${r.id}`}>
                  <Badge variant="outline">{r.title}</Badge>
                </Link>
              ))}
            </div>
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
