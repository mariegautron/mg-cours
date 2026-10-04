"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";

import { saveBonusSettings } from "@/app/(app)/modules/[id]/assessments/bonus-actions";
import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import { OPQUAST_SCALE, type ScaleBand } from "@/lib/assessments/score-scale";

/**
 * Note bonus de certification (ex. Opquast) : on coche, puis on règle le barème par bandes. Le score
 * saisi à la correction (0–1000) donne la note sur 20 ; elle ne fait que remonter la moyenne.
 */
export function BonusSettings({
  moduleId,
  assessmentId,
  isBonus,
  scale,
}: {
  moduleId: string;
  assessmentId: string;
  isBonus: boolean;
  scale: ScaleBand[] | null;
}) {
  const [on, setOn] = useState(isBonus);
  const [bands, setBands] = useState<ScaleBand[]>(scale ?? OPQUAST_SCALE);
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const patch = (i: number, p: Partial<ScaleBand>) =>
    setBands((list) => list.map((b, j) => (j === i ? { ...b, ...p } : b)));
  const num = (v: string) => (v === "" ? NaN : Number(v));

  return (
    <div className="space-y-3">
      <label className="flex min-h-11 items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={on}
          onChange={(e) => setOn(e.target.checked)}
        />
        <span>
          <strong>Note bonus de certification</strong> (ex. Opquast). Le score saisi donne la note
          sur 20 ; elle ne fait que remonter la moyenne du module et ne compte pas dans les notes
          exigées.
        </span>
      </label>
      {on ? (
        <div className="space-y-2">
          <table className="w-full text-sm">
            <caption className="sr-only">Barème : score minimum, maximum, note sur 20</caption>
            <thead>
              <tr className="text-muted-foreground text-left">
                <th scope="col" className="py-1">
                  Score min
                </th>
                <th scope="col">Score max</th>
                <th scope="col">Note /20</th>
                <th scope="col" className="sr-only">
                  Retirer
                </th>
              </tr>
            </thead>
            <tbody>
              {bands.map((b, i) => (
                <tr key={i} className="border-t">
                  {(["min", "max", "points"] as const).map((k) => (
                    <td key={k} className="py-1 pr-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        aria-label={`Bande ${i + 1} : ${
                          k === "min"
                            ? "score minimum"
                            : k === "max"
                              ? "score maximum"
                              : "note sur 20"
                        }`}
                        value={Number.isNaN(b[k]) ? "" : b[k]}
                        onChange={(e) => patch(i, { [k]: num(e.target.value) })}
                        className="border-input bg-background min-h-11 w-24 rounded-xl border px-2"
                      />
                    </td>
                  ))}
                  <td>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Retirer la bande ${i + 1}`}
                      onClick={() => setBands((list) => list.filter((_, j) => j !== i))}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="touch"
              onClick={() =>
                setBands((list) => [
                  ...list,
                  {
                    min: (list.at(-1)?.max ?? -1) + 1,
                    max: (list.at(-1)?.max ?? -1) + 1,
                    points: 0,
                  },
                ])
              }
            >
              <Plus aria-hidden />
              Ajouter une bande
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="touch"
              onClick={() => setBands(OPQUAST_SCALE)}
            >
              Rétablir le barème Opquast
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Bornes incluses. Barème Opquast proposé d’après la fiche : les bornes sont à confirmer
            avec l’école.
          </p>
        </div>
      ) : null}
      <PendingButton
        type="button"
        size="touch"
        pending={pending}
        pendingLabel="Enregistrement…"
        onClick={() =>
          start(async () => {
            const r = await saveBonusSettings(moduleId, assessmentId, { isBonus: on, bands });
            setError(r.error);
            setMessage(r.saved ? "Note bonus enregistrée." : "");
          })
        }
      >
        Enregistrer la note bonus
      </PendingButton>
      <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
        {message}
      </p>
      {error ? <ActionError error={error} /> : null}
    </div>
  );
}
