"use client";

import { useActionState } from "react";

import { saveOralSettings } from "@/app/(app)/modules/[id]/assessments/[assessmentId]/oral/actions";
import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Heure de début et durée par groupe d'un oral, à régler la veille depuis la page de l'évaluation. */
export function OralTimingForm({
  moduleId,
  assessmentId,
  startTime,
  durationMinutes,
  courseStart,
}: {
  moduleId: string;
  assessmentId: string;
  startTime: string | null;
  durationMinutes: number | null;
  /** Heure de la séance rattachée : proposée quand aucune heure de début n'est réglée. */
  courseStart: string | null;
}) {
  const [state, action, pending] = useActionState(
    saveOralSettings.bind(null, moduleId, assessmentId),
    {},
  );
  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="prep-oral-start">Heure de début</Label>
          <Input
            id="prep-oral-start"
            name="startTime"
            type="time"
            defaultValue={startTime ?? courseStart ?? ""}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="prep-oral-duration">Durée par groupe (min)</Label>
          <Input
            id="prep-oral-duration"
            name="durationMinutes"
            type="number"
            min={1}
            max={240}
            className="w-28"
            defaultValue={durationMinutes ?? ""}
            placeholder="15"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={pending}>
          Enregistrer les horaires
        </Button>
      </div>
      {!startTime && courseStart ? (
        <p className="text-muted-foreground text-xs">Proposée : l’heure de la séance rattachée.</p>
      ) : null}
      {state.error ? <ActionError error={state.error} /> : null}
      {state.message ? (
        <p role="status" className="text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
