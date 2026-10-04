"use client";

import { useActionState, useId } from "react";

import {
  deleteEmptySessions,
  type PruneState,
} from "@/app/(app)/modules/[id]/courses/workspace-actions";
import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * « Supprimer les séances vides sans date » : aperçu des séances concernées, puis suppression en
 * retapant leur nombre. Une séance avec une date, une ressource ou du texte n'est jamais concernée.
 */
export function PruneEmptySessions({
  moduleId,
  sessions,
}: {
  moduleId: string;
  sessions: { id: string; title: string; position: number }[];
}) {
  const id = useId();
  const [state, action, pending] = useActionState<PruneState, FormData>(
    deleteEmptySessions.bind(null, moduleId),
    {},
  );

  if (sessions.length === 0) {
    return state.done ? (
      <p role="status" className="text-sm">
        {state.done}
      </p>
    ) : null;
  }

  return (
    <details className="bg-card rounded-3xl border p-4">
      <summary className="min-h-11 cursor-pointer text-sm font-semibold">
        {sessions.length} séance{sessions.length > 1 ? "s" : ""} vide
        {sessions.length > 1 ? "s" : ""} sans date : les supprimer ?
      </summary>
      <form action={action} className="mt-3 space-y-3">
        <p className="text-muted-foreground text-sm">
          Ces séances n’ont ni date, ni ressource, ni texte, ni évaluation, et sont encore « à
          préparer ». Vérifie la liste avant de confirmer.
        </p>
        <ul className="list-disc space-y-0.5 pl-5 text-sm">
          {sessions.map((s) => (
            <li key={s.id}>
              Séance {s.position} · {s.title}
            </li>
          ))}
        </ul>
        <div className="space-y-1">
          <Label htmlFor={`${id}-count`}>
            Pour confirmer, retape le nombre de séances à supprimer ({sessions.length})
          </Label>
          <Input
            id={`${id}-count`}
            name="count"
            inputMode="numeric"
            autoComplete="off"
            className="w-32"
            required
          />
        </div>
        {state.error ? <ActionError error={state.error} /> : null}
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Suppression…" : "Supprimer les séances vides sans date"}
        </Button>
        <p role="status" className="sr-only">
          {state.done ?? ""}
        </p>
      </form>
    </details>
  );
}
