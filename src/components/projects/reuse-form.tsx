"use client";

import { useActionState } from "react";

import { startFromProject } from "@/app/(app)/modules/[id]/project/reuse-action";
import { ActionError } from "@/components/action-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { keepFormValues } from "@/lib/use-kept-form";

/** Le nouveau thème : titre et client facultatifs, thèmes au choix repris ou non. */
export function ReuseForm({
  moduleId,
  sourceId,
  hasThemes,
}: {
  moduleId: string;
  sourceId: string;
  hasThemes: boolean;
}) {
  const [state, formAction, pending] = useActionState(startFromProject.bind(null, moduleId), {});
  return (
    <form onSubmit={keepFormValues(formAction)} className="space-y-3">
      <input type="hidden" name="sourceProjectId" value={sourceId} />
      <div className="space-y-1">
        <Label htmlFor="reuse-title" className="text-muted-foreground font-normal">
          Titre du projet
        </Label>
        <Input
          id="reuse-title"
          name="title"
          maxLength={200}
          placeholder="Ex. : digitalisation d’un festival"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="reuse-client" className="text-muted-foreground font-normal">
          Le client
        </Label>
        <Input
          id="reuse-client"
          name="client"
          maxLength={2000}
          placeholder="Ex. : la directrice du festival"
        />
      </div>
      {hasThemes ? (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="keepThemes" className="size-4" />
          Reprendre aussi les thèmes au choix
        </label>
      ) : null}
      {state.error ? <ActionError error={state.error} /> : null}
      <PendingButton type="submit" className="w-full" pending={pending} pendingLabel="Création…">
        Créer le projet
      </PendingButton>
      <p className="text-muted-foreground text-[0.8rem]">
        Tu retrouves ensuite le brief section par section, avec ce qui reste à réécrire signalé.
      </p>
    </form>
  );
}
