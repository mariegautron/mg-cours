"use client";

import { useActionState } from "react";

import { ActionError } from "@/components/action-error";
import type { NotebookState } from "@/app/(app)/modules/[id]/courses/[courseId]/notebook/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { keepFormValues } from "@/lib/use-kept-form";

type Action = (state: NotebookState, formData: FormData) => Promise<NotebookState>;

/** Consigne pour la prochaine fois : projetée à l'ouverture de la séance suivante (US-68). */
export function NextTimeForm({ action, value }: { action: Action; value: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form onSubmit={keepFormValues(formAction)} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="nextTime">Consigne pour la prochaine fois</Label>
        <Textarea
          id="nextTime"
          name="nextTime"
          defaultValue={value}
          rows={3}
          maxLength={4000}
          aria-describedby="nextTime-hint"
        />
        <p id="nextTime-hint" className="text-muted-foreground text-xs">
          Elle sera projetée aux étudiant·es à l’ouverture de la séance suivante : écris-la pour
          elles.
        </p>
      </div>
      <PendingButton type="submit" pending={pending} pendingLabel="Enregistrement…">
        Enregistrer la consigne
      </PendingButton>
      <p role="status" className="min-h-5 text-sm font-medium">
        {state.message ?? ""}
      </p>
      {state.error ? <ActionError error={state.error} /> : null}
    </form>
  );
}
