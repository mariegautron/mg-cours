"use client";

import { useActionState, useState } from "react";

import { ActionError } from "@/components/action-error";
import type { RetainState } from "@/app/(app)/modules/[id]/retained/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { Label } from "@/components/ui/label";

/** « Ajouter au module… » : retient la ressource pour le module choisi (US-55). */
export function AddToModule({
  resourceId,
  modules,
  action,
}: {
  resourceId: string;
  modules: { id: string; name: string; year: number }[];
  action: (state: RetainState, formData: FormData) => Promise<RetainState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [open, setOpen] = useState(false);
  if (modules.length === 0) return null;
  const selectId = `add-to-module-${resourceId}`;
  // Les choix de modules ne sont rendus qu'à l'ouverture : une longue liste de ressources reste légère.
  if (!open) {
    return (
      <button
        type="button"
        aria-expanded={false}
        onClick={() => setOpen(true)}
        className="text-primary focus-visible:ring-ring inline-flex min-h-11 items-center rounded-sm text-sm font-semibold underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
      >
        Ajouter au module…
        <span className="sr-only"> : choisir un module pour cette ressource</span>
      </button>
    );
  }
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor={selectId} className="text-xs">
          Ajouter au module…
        </Label>
        <select
          id={selectId}
          name="moduleId"
          defaultValue=""
          className="border-input h-8 max-w-56 rounded-md border bg-transparent px-2 text-sm"
        >
          <option value="" disabled>
            Choisir un module
          </option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.year})
            </option>
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
      <p aria-live="polite" className="text-sm">
        {state.done ?? ""}
      </p>
      {state.error ? <ActionError error={state.error} /> : null}
    </form>
  );
}
