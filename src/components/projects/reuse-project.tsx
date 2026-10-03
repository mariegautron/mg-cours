"use client";

import { useActionState } from "react";

import { startFromProject } from "@/app/(app)/modules/[id]/project/reuse-action";
import { ActionError } from "@/components/action-error";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { COPIED_LABELS, NOT_COPIED_LABELS, reusableLabel } from "@/lib/projects/reuse";

/** « Partir d'un projet existant » (US-129) : choisir un projet d'un autre module, voir ce qui est repris. */
export function ReuseProject({
  moduleId,
  projects,
}: {
  moduleId: string;
  projects: { id: string; title: string; moduleName: string; year: number }[];
}) {
  const [state, action, pending] = useActionState(startFromProject.bind(null, moduleId), {});
  if (projects.length === 0) return null;

  return (
    <details className="rounded-lg border p-4">
      <summary className="cursor-pointer font-medium">Partir d’un projet existant</summary>
      <form action={action} className="mt-3 space-y-3">
        <div className="space-y-1">
          <Label htmlFor="sourceProjectId">Projet à reprendre</Label>
          <select
            id="sourceProjectId"
            name="sourceProjectId"
            required
            defaultValue=""
            className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="" disabled>
              Choisir un projet…
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {reusableLabel(p)}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="keepThemes" />
          Reprendre aussi les thèmes au choix
        </label>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="font-medium">Repris</p>
            <ul className="list-disc pl-5">
              {COPIED_LABELS.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">Jamais repris</p>
            <ul className="list-disc pl-5">
              {NOT_COPIED_LABELS.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </div>
        <PendingButton type="submit" pending={pending} pendingLabel="Création…">
          Créer le projet à partir de celui-ci
        </PendingButton>
        {state.error ? <ActionError error={state.error} /> : null}
      </form>
    </details>
  );
}
