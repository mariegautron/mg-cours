"use client";

import { useActionState } from "react";
import { Copy } from "lucide-react";

import { duplicateResource, type ResourceFormState } from "@/app/(app)/resources/actions";
import { ActionError } from "@/components/action-error";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { schoolYearOf } from "@/lib/modules/list-state";
import type { CourseOrigin } from "@/lib/resources/course-origin";

/** « Dupliquer » : la copie est retenue pour le module choisi (et la séance d'origine). */
export function DuplicateResource({
  resourceId,
  modules,
  origin,
  open = false,
}: {
  resourceId: string;
  modules: { id: string; name: string; year: number }[];
  origin: CourseOrigin | null;
  open?: boolean;
}) {
  const [state, action, pending] = useActionState<ResourceFormState, FormData>(
    duplicateResource.bind(null, resourceId),
    {},
  );
  // Même nom pour deux modules : on précise l'année.
  const twice = new Set(modules.map((m) => m.name).filter((n, i, all) => all.indexOf(n) !== i));
  return (
    <details id="dupliquer" open={open} className="w-full rounded-md border p-3">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
        <Copy aria-hidden className="size-4" />
        Dupliquer pour un autre module
      </summary>
      <form action={action} className="mt-2 space-y-2">
        <p className="text-muted-foreground text-sm">
          À réserver au cas où tu réécris vraiment le cours : sinon, garde la même ressource pour
          les deux modules (une correction profite aux deux).
        </p>
        <div className="space-y-1">
          <Label htmlFor="dup-module">Pour le module</Label>
          <select
            id="dup-module"
            name="moduleId"
            defaultValue={origin?.moduleId ?? ""}
            className="border-input h-11 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">Aucun : juste une copie dans la bibliothèque</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {twice.has(m.name) ? ` (${schoolYearOf(m.year)})` : ""}
              </option>
            ))}
          </select>
        </div>
        {origin ? (
          <>
            <input type="hidden" name="courseId" value={origin.courseId} />
            <p className="text-sm">
              Avec ce module, la copie s’ajoute aussi au déroulé de la{" "}
              {origin.label.replace(/^Séance/, "séance")}.
            </p>
          </>
        ) : null}
        {state.error ? <ActionError error={state.error} /> : null}
        <PendingButton type="submit" pending={pending} pendingLabel="Copie…">
          Créer la copie et l’ouvrir
        </PendingButton>
      </form>
    </details>
  );
}
