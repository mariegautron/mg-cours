"use client";

import { useActionState } from "react";

import {
  addCustomExpectation,
  type CustomExpectationState,
} from "@/app/(app)/modules/[id]/expectations/actions";
import { ActionError } from "@/components/action-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";

/** « Ajouter un attendu à toi » : un attendu propre au module, rapproché comme ceux de l'école. */
export function AddExpectationForm({ moduleId }: { moduleId: string }) {
  const [state, action, pending] = useActionState<CustomExpectationState, FormData>(
    addCustomExpectation.bind(null, moduleId),
    {},
  );
  return (
    <form key={state.saved ? "saved" : "form"} action={action} className="space-y-2">
      <Label htmlFor="custom-label" className="text-muted-foreground font-normal">
        Ajouter un attendu à toi
      </Label>
      <Input
        id="custom-label"
        name="label"
        maxLength={1000}
        required
        placeholder="Ex. : Faire une revue de sprint"
      />
      <PendingButton type="submit" variant="outline" pending={pending} pendingLabel="Ajout…">
        Ajouter
      </PendingButton>
      {state.error ? <ActionError error={state.error} /> : null}
    </form>
  );
}
