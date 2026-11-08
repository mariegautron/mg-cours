"use client";

import { useActionState } from "react";
import Link from "next/link";

import { ActionError } from "@/components/action-error";
import type { GroupFormState } from "@/app/(app)/modules/[id]/groups/actions";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { keepFormValues } from "@/lib/use-kept-form";

type Action = (state: GroupFormState, formData: FormData) => Promise<GroupFormState>;

const GROUP_TYPE_LABELS: Record<string, string> = {
  tp: "TP",
  td: "TD",
  project: "Projet",
};

export function GroupForm({
  action,
  moduleId,
  assessments = [],
}: {
  action: Action;
  moduleId: string;
  /** Évaluations du module : le nouveau groupe peut y être ajouté d'emblée. */
  assessments?: { id: string; title: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form onSubmit={keepFormValues(formAction)} className="max-w-md space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nom du groupe</Label>
        <Input
          id="name"
          name="name"
          required
          aria-describedby={fe.name ? "name-error" : undefined}
        />
        {fe.name?.length ? (
          <p id="name-error" role="alert" className="text-destructive text-sm">
            {fe.name.join(" ")}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <select
          id="type"
          name="type"
          defaultValue="project"
          className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
        >
          {Object.entries(GROUP_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {assessments.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-base font-medium">L’ajouter aux évaluations</legend>
          <p className="text-muted-foreground text-sm">
            Décoche celles où ce groupe n’est pas évalué.
          </p>
          <input type="hidden" name="assessmentsChosen" value="1" />
          {assessments.map((a) => (
            <label key={a.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="assessmentIds" value={a.id} defaultChecked />
              {a.title}
            </label>
          ))}
        </fieldset>
      ) : null}
      {state.error ? <ActionError error={state.error} /> : null}
      <div className="flex gap-3">
        <PendingButton type="submit" pending={pending} pendingLabel="Enregistrement…">
          Créer le groupe
        </PendingButton>
        <Button type="button" variant="ghost" asChild>
          <Link href={`/modules/${moduleId}`}>Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
