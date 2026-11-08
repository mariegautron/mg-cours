"use client";

import { useState, useTransition } from "react";

import { updateSubmitSettings } from "@/app/(app)/modules/[id]/assessments/submission-items-actions";
import { Button } from "@/components/ui/button";

/**
 * « Où rendre » : dans MG COURS (les étudiant·es déposent depuis leur espace, après « Mettre à jour les
 * cours publiés ») ou ailleurs (Moodle…, texte ci-dessus). Le dépôt exige une date limite.
 */
export function SubmitSettings({
  moduleId,
  assessmentId,
  mode,
  accepts,
  hasDeadline,
}: {
  moduleId: string;
  assessmentId: string;
  mode: "app" | "elsewhere";
  accepts: "file" | "link" | "both";
  hasDeadline: boolean;
}) {
  const [m, setM] = useState(mode);
  const [a, setA] = useState(accepts);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="mt-3 space-y-2 border-t pt-3 text-sm">
      <p className="font-medium">Les étudiant·es rendent</p>
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="submit-mode"
            checked={m === "app"}
            onChange={() => setM("app")}
          />
          dans MG COURS
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="submit-mode"
            checked={m === "elsewhere"}
            onChange={() => setM("elsewhere")}
          />
          ailleurs (Moodle…)
        </label>
      </div>
      {m === "app" ? (
        <>
          <label className="flex flex-wrap items-center gap-2">
            Ce qu’on rend
            <select
              value={a}
              onChange={(e) => setA(e.target.value as typeof a)}
              className="bg-background rounded-md border px-2 py-1"
            >
              <option value="file">un fichier</option>
              <option value="link">un lien</option>
              <option value="both">un fichier, un lien ou les deux</option>
            </select>
          </label>
          {!hasDeadline ? (
            <p role="status" className="font-medium">
              Renseigne la date limite (champ « Quand ») : sans elle, un retard ne peut pas être
              signalé.
            </p>
          ) : null}
        </>
      ) : null}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await updateSubmitSettings(moduleId, assessmentId, m, a);
              setNote(
                res.error ?? "Enregistré. Visible après « Mettre à jour les cours publiés ».",
              );
            })
          }
        >
          Enregistrer
        </Button>
        <span role="status" aria-live="polite">
          {note}
        </span>
      </div>
    </div>
  );
}
