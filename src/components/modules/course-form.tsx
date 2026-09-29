"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import type { CourseFormState } from "@/app/(app)/modules/[id]/courses/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResourcePicker } from "@/components/modules/resource-picker";
import { formatTime } from "@/lib/modules/course-duration";
import type { CourseWithResources, PickerSource } from "@/lib/modules/queries";
import { PREP_STATUS_LABELS } from "@/lib/modules/schema";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-guard";
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
  retainedIds = [],
  nextPosition,
}: {
  action: Action;
  moduleId: string;
  course?: CourseWithResources;
  resources: PickerSource[];
  /** Ressources retenues du module (US-55) : proposées en premier. */
  retainedIds?: string[];
  nextPosition: number;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  // Garde anti-perte : toute saisie non enregistrée prévient avant de quitter la page.
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesGuard(dirty);

  return (
    <form
      action={formAction}
      className="max-w-2xl space-y-6"
      onChange={() => setDirty(true)}
      onSubmit={() => setDirty(false)}
    >
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <div className="space-y-2">
          <Label htmlFor="startTime">Début</Label>
          <Input
            id="startTime"
            name="startTime"
            type="time"
            defaultValue={formatTime(course?.start_time)}
            aria-invalid={fe.startTime ? true : undefined}
            aria-describedby={fe.startTime ? "startTime-error" : undefined}
          />
          <FieldError id="startTime" errors={fe.startTime} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">Fin</Label>
          <Input
            id="endTime"
            name="endTime"
            type="time"
            defaultValue={formatTime(course?.end_time)}
            aria-invalid={fe.endTime ? true : undefined}
            aria-describedby={fe.endTime ? "endTime-error" : undefined}
          />
          <FieldError id="endTime" errors={fe.endTime} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prepStatus">Préparation</Label>
          <select
            id="prepStatus"
            name="prepStatus"
            defaultValue={course?.prep_status ?? "todo"}
            className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            {Object.entries(PREP_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
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

      <ResourcePicker
        resources={resources}
        retainedIds={retainedIds}
        initialSelected={course?.resources.map((r) => r.id) ?? []}
      />

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
          <Link
            href={`/modules/${moduleId}#courses`}
            onClick={(e) => {
              if (dirty && !window.confirm("Abandonner les modifications non enregistrées ?")) {
                e.preventDefault();
              }
            }}
          >
            Annuler
          </Link>
        </Button>
      </div>
    </form>
  );
}
