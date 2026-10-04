"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { notePhase } from "@/app/(app)/modules/[id]/project/actions";
import { ActionError } from "@/components/action-error";
import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";

export interface PhaseRow {
  title: string;
  deliverable: string | null;
  /** Évaluation du projet qui porte déjà cette phase. */
  assessment: { id: string; title: string; graded: boolean } | null;
}

/** « Les phases » du brief : lesquelles sont notées, et « Noter la phase » pour les autres. */
export function PhaseList({ moduleId, phases }: { moduleId: string; phases: PhaseRow[] }) {
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [, start] = useTransition();
  return (
    <div className="space-y-2">
      <ol>
        {phases.map((p, i) => (
          <li key={`${p.title}-${i}`} className="flex flex-wrap items-center gap-3 border-t py-3">
            <Pill>{i + 1}</Pill>
            <div className="min-w-0 flex-1">
              <strong className="block">{p.title}</strong>
              {p.deliverable ? (
                <span className="text-muted-foreground text-[0.8rem]">
                  Livrable : {p.deliverable}
                </span>
              ) : null}
            </div>
            {p.assessment ? (
              <>
                <Pill tone={p.assessment.graded ? "ok" : "wip"}>
                  {p.assessment.graded ? "Notée" : "Notée au projet"}
                </Pill>
                <Button asChild variant="outline" size="touch">
                  <Link href={`/modules/${moduleId}/assessments/${p.assessment.id}`}>
                    Ouvrir l’évaluation
                    <span className="sr-only"> : {p.title}</span>
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Pill>Sans note</Pill>
                <PendingButton
                  type="button"
                  variant="secondary"
                  size="touch"
                  pending={pendingIndex === i}
                  pendingLabel="Création…"
                  aria-label={`Noter la phase ${i + 1} : ${p.title}`}
                  onClick={() => {
                    if (pendingIndex !== null) return;
                    setPendingIndex(i);
                    start(async () => {
                      const r = await notePhase(moduleId, p.title, p.deliverable ?? "");
                      setPendingIndex(null);
                      setError(r.error);
                      setMessage(r.done ?? "");
                    });
                  }}
                >
                  Noter la phase {i + 1}
                </PendingButton>
              </>
            )}
          </li>
        ))}
      </ol>
      <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
        {message}
      </p>
      {error ? <ActionError error={error} /> : null}
    </div>
  );
}
