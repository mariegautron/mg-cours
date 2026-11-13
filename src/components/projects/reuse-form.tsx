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
  replace = false,
}: {
  moduleId: string;
  sourceId: string;
  hasThemes: boolean;
  /** Le module a déjà un projet : la reprise remplace son brief (après confirmation). */
  replace?: boolean;
}) {
  const [state, formAction, pending] = useActionState(startFromProject.bind(null, moduleId), {});
  return (
    <form
      onSubmit={(e) => {
        if (replace && !window.confirm("Ceci va remplacer le brief actuel. Continuer ?")) {
          e.preventDefault();
          return;
        }
        keepFormValues(formAction)(e);
      }}
      className="space-y-3"
    >
      <input type="hidden" name="sourceProjectId" value={sourceId} />
      {replace ? <input type="hidden" name="replace" value="1" /> : null}
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
      <PendingButton
        type="submit"
        className="w-full"
        pending={pending}
        pendingLabel={replace ? "Remplacement…" : "Création…"}
      >
        {replace ? "Remplacer le brief" : "Créer le projet"}
      </PendingButton>
      <p className="text-muted-foreground text-[0.8125rem]">
        {replace
          ? "Le brief actuel est remplacé ; les évaluations, groupes et notes du module ne bougent pas. Les thèmes repris s’ajoutent à ceux du projet."
          : "Tu retrouves ensuite le brief section par section, avec ce qui reste à réécrire signalé."}
      </p>
    </form>
  );
}
