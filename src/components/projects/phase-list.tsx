"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { notePhase, unnotePhase } from "@/app/(app)/modules/[id]/project/actions";
import { ActionError } from "@/components/action-error";
import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { UNDO_WINDOW_MS } from "@/lib/modules/archive-undo";
import { unnoteConfirmation, unnoteMessage, unnoteWordMatches } from "@/lib/projects/unnote";

export interface PhaseRow {
  title: string;
  deliverable: string | null;
  /** Évaluation du projet qui porte déjà cette phase. */
  assessment: { id: string; title: string; graded: boolean; gradeCount: number } | null;
}

/** « Les phases » du brief : lesquelles sont notées, et « Noter la phase » pour les autres. */
export function PhaseList({ moduleId, phases }: { moduleId: string; phases: PhaseRow[] }) {
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [, start] = useTransition();
  const router = useRouter();
  const uid = useId();
  // Phase dont on propose de ne plus la noter (confirmation dans la ligne), et mot retapé.
  const [confirming, setConfirming] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [removing, setRemoving] = useState(false);

  const unnote = (i: number, p: PhaseRow) => {
    const a = p.assessment;
    if (!a || removing) return;
    setRemoving(true);
    start(async () => {
      const r = await unnotePhase(moduleId, a.id, typed);
      setRemoving(false);
      if (r.error) {
        setError(r.error);
        return;
      }
      setError(undefined);
      setConfirming(null);
      setTyped("");
      setMessage(r.done ?? "");
      // Sans note saisie, « Annuler » (10 s) recrée l'évaluation de la phase.
      if (a.gradeCount === 0) {
        toast.success(r.done ?? "La phase n’est plus notée.", {
          duration: UNDO_WINDOW_MS,
          action: {
            label: "Annuler",
            onClick: () =>
              void notePhase(moduleId, p.title, p.deliverable ?? "").then((again) => {
                if (again.error) toast.error(again.error);
                else toast.success(`La phase ${i + 1} est de nouveau notée.`);
                router.refresh();
              }),
          },
        });
      }
      router.refresh();
    });
  };

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
                <Button
                  type="button"
                  variant="ghost"
                  size="touch"
                  aria-expanded={confirming === i}
                  aria-label={`Ne plus noter la phase ${i + 1} : ${p.title}`}
                  onClick={() => {
                    setConfirming(confirming === i ? null : i);
                    setTyped("");
                    setError(undefined);
                  }}
                >
                  Ne plus noter cette phase
                </Button>
                {confirming === i ? (
                  <div
                    role="group"
                    aria-label={`Confirmer : ne plus noter la phase ${i + 1}`}
                    className="bg-destructive/5 border-destructive/40 basis-full space-y-2 rounded-xl border p-3"
                  >
                    <p className="text-sm font-medium">{unnoteMessage(p.assessment.gradeCount)}</p>
                    {unnoteConfirmation(p.assessment.gradeCount) === "typed" ? (
                      <div className="space-y-1">
                        <Label htmlFor={`${uid}-word-${i}`}>
                          Pour confirmer, retape « supprimer »
                        </Label>
                        <Input
                          id={`${uid}-word-${i}`}
                          value={typed}
                          autoComplete="off"
                          className="w-48"
                          onChange={(e) => setTyped(e.target.value)}
                        />
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={
                          removing ||
                          (unnoteConfirmation(p.assessment.gradeCount) === "typed" &&
                            !unnoteWordMatches(typed))
                        }
                        onClick={() => unnote(i, p)}
                      >
                        {removing ? "Suppression…" : "Supprimer l’évaluation"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setConfirming(null)}>
                        Garder la note
                      </Button>
                    </div>
                  </div>
                ) : null}
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
