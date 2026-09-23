"use client";

import { useActionState } from "react";
import Link from "next/link";

import type { CourseFormState } from "@/app/(app)/modules/[id]/courses/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CourseWithResources } from "@/lib/modules/queries";
import type { Tables } from "@/types/db";

type Action = (state: CourseFormState, formData: FormData) => Promise<CourseFormState>;

const COURSE_TYPE_LABELS: Record<Tables<"course">["type"], string> = {
  lecture: "Cours théorique",
  workshop: "Atelier / TP",
  project: "Projet",
  assessment: "Évaluation",
  demo: "Démonstration",
  applied: "Cours appliqué",
};

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
      {errors.join(" ")}
    </p>
  );
}

export function CourseForm({
  action,
  moduleId,
  course,
  resources,
  nextPosition,
}: {
  action: Action;
  moduleId: string;
  course?: CourseWithResources;
  resources: Pick<Tables<"resource">, "id" | "title">[];
  nextPosition: number;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  const selected = new Set(course?.resources.map((r) => r.id) ?? []);

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Titre de la séance</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={course?.title ?? ""}
          aria-describedby={fe.title ? "title-error" : undefined}
        />
        <FieldError id="title" errors={fe.title} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="type">Modalité</Label>
          <select
            id="type"
            name="type"
            defaultValue={course?.type ?? "lecture"}
            className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            {Object.entries(COURSE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            name="position"
            type="number"
            defaultValue={course?.position ?? nextPosition}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sessionDate">Date</Label>
          <Input
            id="sessionDate"
            name="sessionDate"
            type="date"
            defaultValue={course?.session_date ?? ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="learningObjectives">Objectifs pédagogiques</Label>
        <Textarea
          id="learningObjectives"
          name="learningObjectives"
          rows={4}
          placeholder={"Un objectif par ligne"}
          defaultValue={(course?.learning_objectives ?? []).join("\n")}
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Ressources utilisées</legend>
        {resources.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Aucune ressource disponible —{" "}
            <Link href="/resources/new" className="underline underline-offset-2">
              en créer une
            </Link>
            .
          </p>
        ) : (
          <ul className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
            {resources.map((r) => (
              <li key={r.id} className="flex items-center gap-2">
                <Checkbox
                  id={`resource-${r.id}`}
                  name="resourceIds"
                  value={r.id}
                  defaultChecked={selected.has(r.id)}
                />
                <Label htmlFor={`resource-${r.id}`} className="font-normal">
                  {r.title}
                </Label>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="animationNotes">Modalités d’animation</Label>
        <Textarea
          id="animationNotes"
          name="animationNotes"
          rows={3}
          defaultValue={course?.animation_notes ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="assessmentNotes">Modalités d’évaluation</Label>
        <Textarea
          id="assessmentNotes"
          name="assessmentNotes"
          rows={3}
          defaultValue={course?.assessment_notes ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="material">Matériel nécessaire</Label>
        <Textarea id="material" name="material" rows={2} defaultValue={course?.material ?? ""} />
      </div>

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href={`/modules/${moduleId}`}>Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
