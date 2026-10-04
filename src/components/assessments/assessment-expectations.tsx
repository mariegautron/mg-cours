"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { saveAssessmentExpectations } from "@/app/(app)/modules/[id]/assessments/expectation-actions";
import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { evaluatedLabel } from "@/lib/assessments/evaluated-expectations";

/**
 * « Attendus évalués » : on coche ceux que l'épreuve vérifie parmi les attendus du module ; le
 * compte (« 2 sur 6 ») se met à jour à l'enregistrement. Sans la table, on le dit.
 */
export function AssessmentExpectations({
  moduleId,
  assessmentId,
  expectations,
  initialIds,
  available,
}: {
  moduleId: string;
  assessmentId: string;
  expectations: { id: string; label: string }[];
  initialIds: string[];
  available: boolean;
}) {
  const [saved, setSaved] = useState(new Set(initialIds));
  const [chosen, setChosen] = useState(new Set(initialIds));
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const dirty = chosen.size !== saved.size || [...chosen].some((id) => !saved.has(id));

  if (expectations.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Le module n’a pas encore d’attendus.{" "}
        <Link href={`/modules/${moduleId}/expectations`} className="underline underline-offset-2">
          Lire ou ajouter les attendus
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold" role="status">
        {evaluatedLabel(saved.size, expectations.length)}
        {message ? <span className="sr-only"> — {message}</span> : null}
      </p>
      {!available ? (
        <p className="text-muted-foreground text-sm">
          Disponible après la mise à jour de la base de données.
        </p>
      ) : (
        <>
          <fieldset className="space-y-1">
            <legend className="sr-only">Attendus vérifiés par cette évaluation</legend>
            {expectations.map((e) => (
              <label key={e.id} className="flex min-h-11 items-start gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={chosen.has(e.id)}
                  onChange={(ev) =>
                    setChosen((prev) => {
                      const next = new Set(prev);
                      if (ev.target.checked) next.add(e.id);
                      else next.delete(e.id);
                      return next;
                    })
                  }
                />
                {e.label}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-wrap items-center gap-2">
            <PendingButton
              type="button"
              variant={dirty ? "default" : "outline"}
              size="touch"
              pending={pending}
              pendingLabel="Enregistrement…"
              onClick={() =>
                start(async () => {
                  const r = await saveAssessmentExpectations(moduleId, assessmentId, [...chosen]);
                  setError(r.error);
                  if (!r.error) {
                    setSaved(new Set(chosen));
                    setMessage("Attendus enregistrés.");
                  }
                })
              }
            >
              Enregistrer les attendus
            </PendingButton>
            {dirty ? (
              <Button
                type="button"
                variant="ghost"
                size="touch"
                onClick={() => setChosen(new Set(saved))}
              >
                Annuler
              </Button>
            ) : null}
          </div>
          {error ? <ActionError error={error} /> : null}
        </>
      )}
    </div>
  );
}
