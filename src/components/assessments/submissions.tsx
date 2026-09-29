"use client";

import { useActionState } from "react";

import { saveSubmission } from "@/app/(app)/modules/[id]/assessments/[assessmentId]/submissions-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SubmissionRow } from "@/lib/projects/submission";

function Row({
  moduleId,
  assessmentId,
  row,
}: {
  moduleId: string;
  assessmentId: string;
  row: SubmissionRow;
}) {
  const [state, action, pending] = useActionState(
    saveSubmission.bind(null, moduleId, assessmentId, row.groupId),
    {},
  );
  return (
    <li className="rounded-md border p-3">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <p className="w-full font-medium sm:w-40">{row.groupName}</p>
        <div className="space-y-1">
          <Label htmlFor={`recv-${row.groupId}`}>Reçu le ({row.groupName})</Label>
          <Input
            id={`recv-${row.groupId}`}
            name="receivedOn"
            type="date"
            defaultValue={row.receivedOn ?? ""}
          />
        </div>
        <div className="min-w-48 flex-1 space-y-1">
          <Label htmlFor={`url-${row.groupId}`}>Lien du rendu ({row.groupName})</Label>
          <Input
            id={`url-${row.groupId}`}
            name="url"
            type="url"
            placeholder="https://…"
            defaultValue={row.url ?? ""}
          />
        </div>
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          Enregistrer<span className="sr-only"> le rendu de {row.groupName}</span>
        </Button>
      </form>
      {row.url ? (
        <a
          href={row.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-sm underline underline-offset-2"
        >
          Ouvrir le rendu de {row.groupName}
          <span className="sr-only"> (nouvel onglet)</span>
        </a>
      ) : null}
      <div role="status" aria-live="polite">
        {state.message ? <p className="mt-1 text-sm">{state.message}</p> : null}
      </div>
      {state.error ? (
        <p role="alert" className="text-destructive mt-1 text-sm">
          {state.error}
        </p>
      ) : null}
    </li>
  );
}

/** US-93 : rendu reçu, date et lien (Moodle, dépôt Git) par groupe. Suivi privé de l'enseignante. */
export function Submissions({
  moduleId,
  assessmentId,
  rows,
}: {
  moduleId: string;
  assessmentId: string;
  rows: SubmissionRow[];
}) {
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <Row key={row.groupId} moduleId={moduleId} assessmentId={assessmentId} row={row} />
      ))}
    </ul>
  );
}
