"use client";

import { useActionState } from "react";

import type { GradeFormState } from "@/app/(app)/modules/[id]/assessments/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GridWithCriteria } from "@/lib/assessments/queries";
import type { Tables } from "@/types/db";

type Action = (state: GradeFormState, formData: FormData) => Promise<GradeFormState>;

export function GradeForm({
  action,
  title,
  grid,
  grade,
  comments,
}: {
  action: Action;
  title: string;
  grid: GridWithCriteria | null;
  grade?: Tables<"grade">;
  comments: Tables<"predefined_comment">[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const scores = (grade?.scores as Record<string, number> | undefined) ?? {};
  const selectedComments = new Set(grade?.predefined_comment_ids ?? []);
  const total = grid
    ? grid.criteria.reduce((sum, c) => sum + (scores[c.id] ?? 0), 0)
    : (grade?.value ?? "");

  return (
    <form action={formAction} className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">{title}</h3>
        {grade?.value !== undefined && grade?.value !== null ? (
          <span className="text-muted-foreground text-sm">Note actuelle : {grade.value}</span>
        ) : null}
      </div>

      {grid ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {grid.criteria.map((c) => (
            <div key={c.id} className="space-y-1">
              <Label htmlFor={`score_${c.id}`}>
                {c.label} <span className="text-muted-foreground">(/{c.weight})</span>
              </Label>
              <Input
                id={`score_${c.id}`}
                name={`score_${c.id}`}
                type="number"
                step="0.5"
                min={0}
                max={c.weight}
                defaultValue={scores[c.id] ?? ""}
              />
            </div>
          ))}
          <p className="text-muted-foreground text-sm sm:col-span-2">
            Total sur {grid.criteria.reduce((s, c) => s + c.weight, 0)} : {total || 0}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <Label htmlFor="value">Note</Label>
          <Input
            id="value"
            name="value"
            type="number"
            step="0.5"
            defaultValue={grade?.value ?? ""}
            required
          />
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="feedback">Appréciation</Label>
        <Textarea id="feedback" name="feedback" rows={2} defaultValue={grade?.feedback ?? ""} />
      </div>

      {comments.length > 0 ? (
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">Commentaires prédéfinis</legend>
          <ul className="max-h-32 space-y-1 overflow-y-auto">
            {comments.map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                <Checkbox
                  id={`comment_${c.id}`}
                  name="predefinedCommentIds"
                  value={c.id}
                  defaultChecked={selectedComments.has(c.id)}
                  className="mt-0.5"
                />
                <Label htmlFor={`comment_${c.id}`} className="font-normal">
                  {c.text}
                </Label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
          Note enregistrée.
        </p>
      ) : null}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer la note"}
      </Button>
    </form>
  );
}
