"use client";

import { useActionState } from "react";
import Link from "next/link";

import type { AssessmentFormState } from "@/app/(app)/modules/[id]/assessments/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AssessmentDetail } from "@/lib/assessments/queries";
import type { Tables } from "@/types/db";

type Action = (state: AssessmentFormState, formData: FormData) => Promise<AssessmentFormState>;

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
      {errors.join(" ")}
    </p>
  );
}

export function AssessmentForm({
  action,
  moduleId,
  groups,
  grids,
  assessment,
}: {
  action: Action;
  moduleId: string;
  groups: Pick<Tables<"student_group">, "id" | "name">[];
  grids: Pick<Tables<"grading_grid">, "id" | "name">[];
  assessment?: AssessmentDetail;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  // Un seul groupe dans le module : pré-coché à la création.
  const selectedGroupIds = new Set(
    assessment ? assessment.groups.map((g) => g.id) : groups.length === 1 ? [groups[0].id] : [],
  );

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Titre</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={assessment?.title ?? ""}
          aria-describedby={fe.title ? "title-error" : undefined}
        />
        <FieldError id="title" errors={fe.title} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Sujet (Markdown)</Label>
        <p id="subject-hint" className="text-muted-foreground text-sm">
          Consignes complètes : titres (#), listes (-), **gras**, `code`… 20 000 caractères maximum.
        </p>
        <Textarea
          id="subject"
          name="subject"
          rows={10}
          maxLength={20000}
          defaultValue={assessment?.subject ?? ""}
          aria-describedby={fe.subject ? "subject-hint subject-error" : "subject-hint"}
        />
        <FieldError id="subject" errors={fe.subject} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Input
            id="type"
            name="type"
            placeholder="oral, écrit, projet…"
            defaultValue={assessment?.type ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" defaultValue={assessment?.date ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="durationMinutes">Durée (minutes)</Label>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            defaultValue={assessment?.duration_minutes ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="coefficient">Coefficient</Label>
          <Input
            id="coefficient"
            name="coefficient"
            type="number"
            step="0.1"
            defaultValue={assessment?.coefficient ?? 1}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="maxScore">Barème (note sur)</Label>
          <p id="maxScore-hint" className="text-muted-foreground text-sm">
            Laisser vide : total de la grille, ou 20 sans grille. Les moyennes YNOV sont toujours
            ramenées sur 20.
          </p>
          <Input
            id="maxScore"
            name="maxScore"
            type="number"
            step="0.5"
            min={0.5}
            className="sm:w-32"
            defaultValue={assessment?.max_score ?? ""}
            aria-describedby={fe.maxScore ? "maxScore-hint maxScore-error" : "maxScore-hint"}
          />
          <FieldError id="maxScore" errors={fe.maxScore} />
        </div>
        <fieldset
          className="space-y-2 sm:col-span-2"
          aria-describedby={fe.studentGroupIds ? "studentGroupIds-error" : undefined}
        >
          <legend className="text-sm leading-none font-medium">Groupes</legend>
          <p className="text-muted-foreground text-sm">
            Cochez tous les groupes notés sur cette évaluation : elle compte pour une seule note.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {groups.map((g) => (
              <li key={g.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="studentGroupIds"
                    value={g.id}
                    defaultChecked={selectedGroupIds.has(g.id)}
                  />
                  {g.name}
                </label>
              </li>
            ))}
          </ul>
          <FieldError id="studentGroupIds" errors={fe.studentGroupIds} />
        </fieldset>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="gradingGridId">Grille de correction (optionnel)</Label>
          <select
            id="gradingGridId"
            name="gradingGridId"
            defaultValue={assessment?.grading_grid_id ?? ""}
            className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">Aucune — note directe</option>
            {grids.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isGroupGrade"
          defaultChecked={assessment?.is_group_grade ?? false}
        />
        Note de groupe (une note par groupe coché, coefficient ×1 au lieu de ×3)
      </label>

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
            href={
              assessment
                ? `/modules/${moduleId}/assessments/${assessment.id}`
                : `/modules/${moduleId}/assessments`
            }
          >
            Annuler
          </Link>
        </Button>
      </div>
    </form>
  );
}
