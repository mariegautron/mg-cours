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
import { frTime } from "@/lib/fr-time";

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
  // Questions encore sans points : la vue « à relire » est cochée tant qu'il en reste.
  const pendingCount = questions.filter((q) => q.open && !q.initialScore.trim()).length;
  const [onlyToReview, setOnlyToReview] = useState(pendingCount > 0);
  const [openComments, setOpenComments] = useState<Set<number>>(new Set());
  const shown = onlyToReview
    ? questions.filter((q) => q.open && !q.initialScore.trim())
    : questions;

  function save() {
    const sent = snapshot;
    start(async () => {
      const res = await saveAttemptReview(moduleId, assessmentId, attemptId, scores, comments);
      setState((s) => ({ ...s, ...res }));
      if (!res.error) {
        setSaved(sent);
        setSavedAt(frTime());
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

  const half = (n: number) => String(Math.round((n / 2) * 100) / 100).replace(".", ",");

  return (
    <div className="space-y-4">
      {pendingCount > 0 ? (
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Questions affichées</legend>
          {(
            [
              [true, `Seulement les réponses à relire (${pendingCount})`],
              [false, "Toutes les questions"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={label}
              className="has-[:checked]:bg-primary has-[:checked]:text-primary-foreground flex min-h-11 cursor-pointer items-center rounded-xl border px-3 text-sm font-semibold"
            >
              <input
                type="radio"
                name="review-filter"
                className="sr-only"
                checked={onlyToReview === value}
                onChange={() => setOnlyToReview(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>
      ) : null}
      {shown.map((q) => (
        <section
          key={q.position}
          aria-labelledby={`q${q.position}`}
          className="space-y-2 rounded-lg border p-4"
        >
          <h2 id={`q${q.position}`} className="text-sm font-medium">
            Question {q.position} · {fmt(q.points)} point{q.points > 1 ? "s" : ""}
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
            <fieldset className="space-y-1">
              <legend className="text-sm font-medium">Points donnés (sur {fmt(q.points)})</legend>
              <div className="flex flex-wrap items-center gap-2">
                {["0", half(q.points), fmt(q.points)].map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={scores[q.position] === v}
                    onClick={() => setScores((s) => ({ ...s, [q.position]: v }))}
                    className="aria-pressed:bg-primary aria-pressed:text-primary-foreground min-h-11 min-w-14 rounded-xl border px-3 font-semibold"
                  >
                    {v}
                  </button>
                ))}
                <Label htmlFor={`score_${q.position}`} className="text-sm">
                  autre
                </Label>
                <Input
                  id={`score_${q.position}`}
                  inputMode="decimal"
                  className="w-24"
                  value={scores[q.position] ?? ""}
                  onChange={(e) => setScores((s) => ({ ...s, [q.position]: e.target.value }))}
                />
              </div>
            </fieldset>
          ) : null}
          {q.open || comments[q.position]?.trim() || openComments.has(q.position) ? (
            <div className="space-y-1">
              <Label htmlFor={`comment_${q.position}`}>Commentaire (pour toi seule)</Label>
              <Textarea
                id={`comment_${q.position}`}
                rows={2}
                value={comments[q.position] ?? ""}
                onChange={(e) => setComments((c) => ({ ...c, [q.position]: e.target.value }))}
              />
            </div>
          ) : (
            // Question corrigée toute seule : le commentaire reste replié.
            <button
              type="button"
              onClick={() => setOpenComments((o) => new Set(o).add(q.position))}
              className="text-primary min-h-9 text-sm font-semibold"
            >
              + Commentaire
            </button>
          )}
        </section>
      ))}

      <div className="bg-background/95 sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-2 backdrop-blur">
        <p className="font-semibold">
          {fmt(state.score)} / {fmt(state.totalPoints ?? totalPoints)} points
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
            <Link href={nextHref} className="font-semibold underline underline-offset-2">
              Copie suivante →
            </Link>
          ) : null}
          <Link
            href={`/modules/${moduleId}/assessments/${assessmentId}/quiz/links`}
            className="underline underline-offset-2"
          >
            Retour au suivi
          </Link>
        </div>
      </div>
    </div>
  );
}
