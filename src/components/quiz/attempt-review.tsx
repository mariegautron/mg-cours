"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  saveAttemptReview,
  type ReviewSaveState,
} from "@/app/(app)/modules/[id]/assessments/[assessmentId]/quiz/actions";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AUTOSAVE_DELAY_MS } from "@/lib/assessments/session";

export interface ReviewQuestion {
  position: number;
  points: number;
  open: boolean;
  /** Points déjà obtenus (réponses automatiques) ; `null` : à relire. */
  earned: number | null;
  /** Énoncé et réponse, rendus côté serveur. */
  body: React.ReactNode;
  initialScore: string;
  initialComment: string;
}

const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : String(n).replace(".", ",");

/**
 * Relecture d'une copie de QCM : enregistrement automatique (mêmes messages que la correction),
 * un commentaire privé par question, copie précédente / suivante (Alt + ← / →) et barre du bas
 * collante avec le total.
 */
export function AttemptReview({
  moduleId,
  assessmentId,
  attemptId,
  questions,
  totalPoints,
  initialScore,
  initialComplete,
  prevHref,
  nextHref,
}: {
  moduleId: string;
  assessmentId: string;
  attemptId: string;
  questions: ReviewQuestion[];
  totalPoints: number;
  initialScore: number;
  initialComplete: boolean;
  prevHref: string | null;
  nextHref: string | null;
}) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(questions.filter((q) => q.open).map((q) => [q.position, q.initialScore])),
  );
  const [comments, setComments] = useState<Record<string, string>>(
    Object.fromEntries(questions.map((q) => [q.position, q.initialComment])),
  );
  const snapshot = JSON.stringify([scores, comments]);
  const [saved, setSaved] = useState(snapshot);
  const [state, setState] = useState<ReviewSaveState>({
    score: initialScore,
    totalPoints,
    complete: initialComplete,
  });
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const dirty = snapshot !== saved;

  function save() {
    const sent = snapshot;
    start(async () => {
      const res = await saveAttemptReview(moduleId, assessmentId, attemptId, scores, comments);
      setState((s) => ({ ...s, ...res }));
      if (!res.error) {
        setSaved(sent);
        setSavedAt(new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
      }
    });
  }

  useEffect(() => {
    if (!dirty || pending || state.error) return;
    const timer = setTimeout(save, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, dirty, pending, state.error]);

  // Alt + ← / → : copie précédente / suivante ; avertit avant de quitter avec une saisie non enregistrée.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.key === "ArrowLeft" && prevHref) {
        e.preventDefault();
        router.push(prevHref);
      }
      if (e.key === "ArrowRight" && nextHref) {
        e.preventDefault();
        router.push(nextHref);
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [prevHref, nextHref, router, dirty]);

  const status = pending
    ? "Enregistrement…"
    : state.error
      ? "! Pas enregistré"
      : dirty
        ? "Modifications en attente…"
        : savedAt
          ? `Enregistré à ${savedAt}`
          : "Tout est enregistré";

  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <section
          key={q.position}
          aria-labelledby={`q${q.position}`}
          className="space-y-2 rounded-lg border p-4"
        >
          <h2 id={`q${q.position}`} className="text-sm font-medium">
            Question {q.position} · {fmt(q.points)} pt{q.points > 1 ? "s" : ""}
            {q.open
              ? scores[q.position]?.trim()
                ? ` · donnés : ${scores[q.position]}`
                : " · à relire"
              : q.earned !== null
                ? ` · obtenus : ${fmt(q.earned)}`
                : ""}
          </h2>
          {q.body}
          {q.open ? (
            <div className="space-y-1">
              <Label htmlFor={`score_${q.position}`}>Points donnés (sur {fmt(q.points)})</Label>
              <Input
                id={`score_${q.position}`}
                inputMode="decimal"
                className="w-28"
                value={scores[q.position] ?? ""}
                onChange={(e) => setScores((s) => ({ ...s, [q.position]: e.target.value }))}
              />
            </div>
          ) : null}
          <div className="space-y-1">
            <Label htmlFor={`comment_${q.position}`}>Commentaire (pour toi seule)</Label>
            <Textarea
              id={`comment_${q.position}`}
              rows={2}
              value={comments[q.position] ?? ""}
              onChange={(e) => setComments((c) => ({ ...c, [q.position]: e.target.value }))}
            />
          </div>
        </section>
      ))}

      <div className="bg-background/95 sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-2 backdrop-blur">
        <p className="font-semibold">
          {fmt(state.score)} / {fmt(state.totalPoints ?? totalPoints)} pts
          {state.complete ? "" : " (partiel)"}
        </p>
        <p role="status" className="text-sm">
          {status}
          {state.error ? ` — ${state.error}` : ""}
        </p>
        {state.error ? (
          <button type="button" className="text-sm underline" onClick={save}>
            Réessayer
          </button>
        ) : null}
        <div className="ml-auto flex gap-3 text-sm">
          {prevHref ? (
            <Link href={prevHref} className="underline underline-offset-2">
              ← Copie précédente
            </Link>
          ) : null}
          {nextHref ? (
            <Link href={nextHref} className="underline underline-offset-2">
              Copie suivante →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
