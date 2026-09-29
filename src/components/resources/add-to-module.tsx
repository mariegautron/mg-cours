"use client";

import { useActionState } from "react";

import type { RetainState } from "@/app/(app)/modules/[id]/retained/actions";
import { Button } from "@/components/ui/button";
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
  if (modules.length === 0) return null;
  const selectId = `add-to-module-${resourceId}`;
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
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        Ajouter
      </Button>
      <p aria-live="polite" className="text-sm">
        {state.done ?? ""}
      </p>
      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
