"use client";

import { useActionState } from "react";

import { ActionError } from "@/components/action-error";
import {
  createSchoolGrade,
  type SchoolGradeState,
} from "@/app/(app)/modules/[id]/assessments/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { keepFormValues } from "@/lib/use-kept-form";

/** « Note de l'école » : une note imposée par l'école, saisie directement, sans sujet ni grille. */
export function SchoolGradeForm({ moduleId }: { moduleId: string }) {
  const [state, action, pending] = useActionState<SchoolGradeState, FormData>(
    createSchoolGrade.bind(null, moduleId),
    {},
  );
  return (
    <form onSubmit={keepFormValues(action)} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="school-title">Titre de la note</Label>
        <Input
          id="school-title"
          name="title"
          placeholder="Contrôle continu 1"
          required
          maxLength={200}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="school-coef">Coefficient</Label>
        <Input
          id="school-coef"
          name="coefficient"
          type="number"
          step="0.1"
          min="0.1"
          defaultValue={1}
          className="w-28"
        />
      </div>
      {state.error ? <ActionError error={state.error} /> : null}
      <PendingButton type="submit" pending={pending} pendingLabel="Création…">
        Créer la note de l’école
      </PendingButton>
    </form>
  );
}
