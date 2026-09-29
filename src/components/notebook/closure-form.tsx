"use client";

import { useActionState } from "react";

import type { NotebookState } from "@/app/(app)/modules/[id]/courses/[courseId]/notebook/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COMPLETION_OPTIONS, type CourseCompletion } from "@/lib/notebook/notebook";

type Action = (state: NotebookState, formData: FormData) => Promise<NotebookState>;

export function ClosureForm({
  action,
  course,
}: {
  action: Action;
  course: {
    completion: CourseCompletion | null;
    not_covered: string | null;
    next_time: string | null;
    retro_note: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">La séance a été…</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {COMPLETION_OPTIONS.map((o) => (
            <label key={o.value} className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="radio"
                name="completion"
                value={o.value}
                defaultChecked={course.completion === o.value}
                className="accent-primary size-4"
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1">
        <Label htmlFor="notCovered">Points non traités, à reporter</Label>
        <Textarea id="notCovered" name="notCovered" defaultValue={course.not_covered ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="nextTime">À faire pour la prochaine fois</Label>
        <Textarea id="nextTime" name="nextTime" defaultValue={course.next_time ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="retroNote">Retour d’expérience (privé)</Label>
        <Textarea
          id="retroNote"
          name="retroNote"
          defaultValue={course.retro_note ?? ""}
          aria-describedby="retroNote-hint"
        />
        <p id="retroNote-hint" className="text-muted-foreground text-xs">
          Pour vous seule : ce qui a marché, ce qu’il faudra changer la prochaine fois.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <PendingButton type="submit" pending={pending} pendingLabel="Enregistrement…">
          Enregistrer la clôture
        </PendingButton>
        <p role="status" className="text-sm">
          {state.message ?? ""}
        </p>
      </div>
      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
