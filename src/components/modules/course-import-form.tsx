"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";

import type { ImportCoursesState } from "@/app/(app)/modules/[id]/import-courses/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  describeImportedContent,
  describeImportPlan,
  NOT_IMPORTED_LABEL,
  type ImportableCourse,
} from "@/lib/modules/course-import";

const COURSE_TYPE_LABELS: Record<string, string> = {
  lecture: "Cours théorique",
  workshop: "Atelier / TP",
  project: "Projet",
  assessment: "Évaluation",
  demo: "Démonstration",
  applied: "Cours appliqué",
};

/** US-58 : séances à cocher du module source, aperçu de ce qui sera repris. */
export function CourseImportForm({
  action,
  moduleId,
  sourceName,
  courses,
  existingCount,
}: {
  action: (state: ImportCoursesState, formData: FormData) => Promise<ImportCoursesState>;
  moduleId: string;
  sourceName: string;
  courses: ImportableCourse[];
  existingCount: number;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const chosen = useMemo(() => courses.filter((c) => selected.has(c.id)), [courses, selected]);

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  return (
    <form action={formAction} className="space-y-4">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Séances de « {sourceName} » à importer</legend>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setSelected(new Set(courses.map((c) => c.id)))}
          >
            Tout cocher
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Tout décocher
          </Button>
        </div>
        <ol className="divide-y rounded-md border">
          {courses.map((c, i) => (
            <li key={c.id} className="flex items-start gap-3 p-3">
              <Checkbox
                id={`import-${c.id}`}
                name="courseIds"
                value={c.id}
                checked={selected.has(c.id)}
                onCheckedChange={(v) => toggle(c.id, v === true)}
                className="mt-1"
              />
              <Label
                htmlFor={`import-${c.id}`}
                className="flex-col items-start gap-0.5 font-normal"
              >
                <span className="font-medium">
                  Séance {i + 1} — {c.title}
                </span>
                <span className="text-muted-foreground text-sm">
                  {COURSE_TYPE_LABELS[c.type] ?? c.type} · {describeImportedContent(c)}
                </span>
              </Label>
            </li>
          ))}
        </ol>
      </fieldset>

      <section aria-labelledby="preview" className="space-y-2 rounded-lg border p-4">
        <h2 id="preview" className="font-medium">
          Aperçu
        </h2>
        <p role="status" className="text-sm">
          {describeImportPlan(chosen.length, existingCount)}
        </p>
        {chosen.length ? (
          <ol className="list-inside list-decimal text-sm">
            {chosen.map((c, i) => (
              <li key={c.id}>
                {c.title}{" "}
                <span className="text-muted-foreground">
                  (séance {existingCount + i + 1}, à préparer)
                </span>
              </li>
            ))}
          </ol>
        ) : null}
        <p className="text-muted-foreground text-sm">
          Repris : titre, modalité, objectifs, notes et liens vers les ressources. Non repris :{" "}
          {NOT_IMPORTED_LABEL}.
        </p>
      </section>

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending || chosen.length === 0}>
          {pending ? "Import…" : `Importer ${chosen.length} séance${chosen.length > 1 ? "s" : ""}`}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href={`/modules/${moduleId}#courses`}>Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
