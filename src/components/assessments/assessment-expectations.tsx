"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { saveAssessmentExpectations } from "@/app/(app)/modules/[id]/assessments/expectation-actions";
import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";
import { evaluatedLabel } from "@/lib/assessments/evaluated-expectations";

/**
 * « Attendus évalués » : replié par défaut (« 3 attendus évalués · Modifier », seulement ceux
 * cochés) ; « Modifier » ouvre la liste complète, chaque case s'enregistre toute seule.
 * Sans la table, on le dit.
 */
export function AssessmentExpectations({
  moduleId,
  assessmentId,
  expectations,
  initialIds,
  available,
  suggestedIds = [],
}: {
  moduleId: string;
  assessmentId: string;
  expectations: { id: string; label: string }[];
  initialIds: string[];
  available: boolean;
  /** Attendus cités par les critères de la grille de l'évaluation. */
  suggestedIds?: string[];
}) {
  const [saved, setSaved] = useState(new Set(initialIds));
  const [chosen, setChosen] = useState(new Set(initialIds));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const missingSuggested = suggestedIds.filter((id) => !chosen.has(id));

  // Enregistrement automatique à chaque case : une seule façon d'enregistrer, état visible.
  function save(next: Set<string>) {
    setChosen(next);
    start(async () => {
      const r = await saveAssessmentExpectations(moduleId, assessmentId, [...next]);
      setError(r.error);
      if (!r.error) {
        setSaved(new Set(next));
        setSavedAt(
          new Date()
            .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
            .replace(":", " h "),
        );
      }
    });
  }

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

  const checked = expectations.filter((e) => saved.has(e.id));

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="text-sm font-semibold" role="status">
          {evaluatedLabel(saved.size, expectations.length)}
          {pending ? " · enregistrement…" : savedAt ? ` · enregistré à ${savedAt}` : ""}
        </p>
        {available ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-expanded={editing}
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? "Terminé" : "Modifier"}
          </Button>
        ) : null}
      </div>
      {!available ? (
        <p className="text-muted-foreground text-sm">
          Disponible après la mise à jour de la base de données.
        </p>
      ) : !editing ? (
        // Replié par défaut : seulement les attendus cochés, jamais la liste complète qui écrase la colonne.
        checked.length > 0 ? (
          <ul className="list-disc space-y-0.5 pl-5 text-sm">
            {checked.map((e) => (
              <li key={e.id}>{e.label}</li>
            ))}
          </ul>
        ) : null
      ) : (
        <>
          {missingSuggested.length > 0 ? (
            <div role="note" className="bg-muted/50 rounded-xl border p-3 text-sm">
              <p>
                La grille cite {missingSuggested.length} attendu
                {missingSuggested.length > 1 ? "s" : ""} non coché
                {missingSuggested.length > 1 ? "s" : ""} :{" "}
                {missingSuggested
                  .map((id) => expectations.find((e) => e.id === id)?.label)
                  .filter(Boolean)
                  .join(" ; ")}
                .
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => save(new Set([...chosen, ...suggestedIds]))}
              >
                Cocher ceux de la grille
              </Button>
            </div>
          ) : null}
          <fieldset className="space-y-1">
            <legend className="sr-only">Attendus vérifiés par cette évaluation</legend>
            {expectations.map((e) => (
              <label key={e.id} className="flex min-h-11 items-start gap-2 py-1 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={chosen.has(e.id)}
                  onChange={(ev) => {
                    const next = new Set(chosen);
                    if (ev.target.checked) next.add(e.id);
                    else next.delete(e.id);
                    save(next);
                  }}
                />
                <span className="min-w-0">{e.label}</span>
              </label>
            ))}
          </fieldset>
        </>
      )}
      {error ? <ActionError error={error} /> : null}
    </div>
  );
}
