"use client";

import { useState, useTransition } from "react";

import { saveWhereToSubmit } from "@/app/(app)/modules/[id]/assessments/where-actions";
import { ActionError } from "@/components/action-error";
import { PendingButton } from "@/components/ui/pending-button";

/** « Où rendre » : Moodle, section, dossier… Repris dans le cadre projeté (bloc « Où »). */
export function WhereToSubmit({
  moduleId,
  assessmentId,
  initial,
}: {
  moduleId: string;
  assessmentId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | undefined>();
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="mt-3 space-y-1 border-t pt-3">
      <label htmlFor={`where-${assessmentId}`} className="text-sm font-medium">
        Où rendre
      </label>
      <p className="text-muted-foreground text-sm">
        L’endroit où les étudiant·es déposent leur travail. Projeté dans le cadre.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={`where-${assessmentId}`}
          value={value}
          maxLength={200}
          placeholder="Ex. Moodle, section « Projet »"
          onChange={(e) => setValue(e.target.value)}
          className="border-input bg-background min-h-11 min-w-56 flex-1 rounded-xl border px-3"
        />
        <PendingButton
          type="button"
          variant={value.trim() === saved.trim() ? "outline" : "default"}
          size="touch"
          pending={pending}
          pendingLabel="Enregistrement…"
          onClick={() =>
            start(async () => {
              const r = await saveWhereToSubmit(moduleId, assessmentId, value);
              setError(r.error);
              if (!r.error) {
                setSaved(r.value ?? "");
                setValue(r.value ?? "");
                setNote(r.value ? "« Où rendre » enregistré." : "« Où rendre » retiré.");
              }
            })
          }
        >
          Enregistrer
          <span className="sr-only"> « où rendre »</span>
        </PendingButton>
      </div>
      <p role="status" className="text-muted-foreground min-h-5 text-sm">
        {note}
      </p>
      {error ? <ActionError error={error} /> : null}
    </div>
  );
}
