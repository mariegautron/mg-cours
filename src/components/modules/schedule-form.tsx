"use client";

import { useActionState } from "react";
import Link from "next/link";

import { ActionError } from "@/components/action-error";
import type { ModuleFormState } from "@/app/(app)/modules/actions";
import { ScheduleEditor } from "@/components/modules/schedule-editor";
import type { ModuleDates } from "@/lib/modules/hyperplanning";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { keepFormValues } from "@/lib/use-kept-form";

/** Planning d'un module existant : mêmes saisies que le formulaire de création. */
export function ScheduleForm({
  action,
  moduleId,
  totalHours,
  existingCount,
  existing,
}: {
  action: (state: ModuleFormState, formData: FormData) => Promise<ModuleFormState>;
  moduleId: string;
  totalHours: number;
  existingCount: number;
  existing: { name: string; dates: ModuleDates };
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form onSubmit={keepFormValues(formAction)} className="space-y-6">
      <ScheduleEditor totalHours={totalHours} existingCount={existingCount} existing={existing} />
      {state.error ? <ActionError error={state.error} /> : null}
      <div className="flex gap-3">
        <PendingButton type="submit" pending={pending} pendingLabel="Création…">
          Créer les séances
        </PendingButton>
        <Button type="button" variant="ghost" asChild>
          <Link href={`/modules/${moduleId}#courses`}>Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
