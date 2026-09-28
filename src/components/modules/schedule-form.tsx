"use client";

import { useActionState } from "react";
import Link from "next/link";

import type { ModuleFormState } from "@/app/(app)/modules/actions";
import { ScheduleEditor } from "@/components/modules/schedule-editor";
import { Button } from "@/components/ui/button";

/** Planning d'un module existant : mêmes saisies que le formulaire de création. */
export function ScheduleForm({
  action,
  moduleId,
  totalHours,
  existingCount,
}: {
  action: (state: ModuleFormState, formData: FormData) => Promise<ModuleFormState>;
  moduleId: string;
  totalHours: number;
  existingCount: number;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-6">
      <ScheduleEditor totalHours={totalHours} existingCount={existingCount} />
      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Création…" : "Créer les séances"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href={`/modules/${moduleId}#courses`}>Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
