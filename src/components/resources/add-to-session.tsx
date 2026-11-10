"use client";

import { useActionState, useState, useTransition } from "react";

import { ActionError } from "@/components/action-error";
import {
  listSessionChoices,
  type AddToSessionState,
  type SessionChoice,
} from "@/app/(app)/resources/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { Label } from "@/components/ui/label";
import { schoolYearOf } from "@/lib/modules/list-state";

/**
 * « Ajouter à une séance… » : place la ressource dans le déroulé d'une séance d'un module en cours.
 * Une ressource est dans le déroulé d'une séance, rien d'autre (doublon D28).
 */
export function AddToSession({
  resourceId,
  action,
}: {
  resourceId: string;
  action: (state: AddToSessionState, formData: FormData) => Promise<AddToSessionState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [choices, setChoices] = useState<SessionChoice[] | null>(null);
  const [loading, startLoading] = useTransition();
  const selectId = `add-to-session-${resourceId}`;
  // Les séances ne sont lues qu'à l'ouverture : une longue liste de ressources reste légère.
  if (choices === null) {
    return (
      <button
        type="button"
        aria-expanded={false}
        disabled={loading}
        onClick={() => startLoading(async () => setChoices(await listSessionChoices()))}
        className="text-primary focus-visible:ring-ring inline-flex min-h-11 items-center rounded-sm text-sm font-semibold underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
      >
        Ajouter à une séance…
        <span className="sr-only"> : choisir une séance pour cette ressource</span>
      </button>
    );
  }
  if (choices.length === 0) {
    return <p className="text-muted-foreground text-sm">Aucune séance d’un module en cours.</p>;
  }
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor={selectId} className="text-xs">
          Ajouter à une séance…
        </Label>
        <select
          id={selectId}
          name="courseId"
          defaultValue=""
          className="border-input h-8 max-w-72 rounded-md border bg-transparent px-2 text-sm"
        >
          <option value="" disabled>
            Choisir une séance
          </option>
          {choices.map((m) => (
            <optgroup key={m.moduleId} label={`${m.moduleName} (${schoolYearOf(m.year)})`}>
              {m.sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <PendingButton
        type="submit"
        size="sm"
        variant="secondary"
        pending={pending}
        pendingLabel="Ajout…"
      >
        Ajouter
      </PendingButton>
      <p aria-live="polite" className="basis-full text-sm">
        {state.done ?? ""}
      </p>
      {state.error ? <ActionError error={state.error} /> : null}
    </form>
  );
}
