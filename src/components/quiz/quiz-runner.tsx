"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ActionError } from "@/components/action-error";
import { saveQuiz, submitQuiz } from "@/app/q/[token]/actions";
import { Markdown } from "@/components/markdown";
import { QuestionView } from "@/components/questions/question-view";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuestionType } from "@/lib/questions/types";
import { announcementAt, formatRemaining } from "@/lib/quiz/timer";
import { clearPendingAnswers, mergePendingAnswers, storePendingAnswers } from "@/lib/quiz/pending";
import { useOnline } from "@/lib/use-online";
import type { StoredAnswer } from "@/lib/quiz/types";

export interface PublicQuestion {
  position: number;
  type: QuestionType;
  statement: string;
  points: number;
  choices: { id: number; text: string }[];
}

type SaveState = "saved" | "dirty" | "saving" | "error";

export function QuizRunner({
  token,
  title,
  instructions,
  deadlineAt,
  serverNow,
  questions,
  initialAnswers,
}: {
  token: string;
  title: string;
  instructions: string;
  deadlineAt: string | null;
  serverNow: string;
  questions: PublicQuestion[];
  initialAnswers: Record<string, StoredAnswer>;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState(initialAnswers);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // Écart entre l'horloge du serveur et celle de l'appareil : le chrono suit le serveur.
  const offset = useRef(0);
  const deadline = deadlineAt ? new Date(deadlineAt).getTime() : null;
  const [remaining, setRemaining] = useState<number | null>(null);

  const online = useOnline();
  // Réponses gardées sur l'appareil tant qu'elles n'ont pas toutes été envoyées (connexion coupée,
  // onglet fermé) ; « recovered » : combien sont parties au retour du réseau.
  const [recovered, setRecovered] = useState<number | null>(null);
  const wasFailing = useRef(false);
  const latest = useRef(answers);
  const dirty = useRef(false);
  const inFlight = useRef(false);
  const submitted = useRef(false);
  const confirmRef = useRef<HTMLHeadingElement>(null);

  const flush = useCallback(async () => {
    if (inFlight.current || submitted.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      dirty.current = true;
      wasFailing.current = true;
      setSaveState("error");
      return;
    }
    inFlight.current = true;
    dirty.current = false;
    setSaveState("saving");
    try {
      const result = await saveQuiz(token, latest.current);
      if (result.status === "ok") {
        setSavedAt(
          new Date().toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Paris",
          }),
        );
        setSaveState(dirty.current ? "dirty" : "saved");
        if (!dirty.current) {
          clearPendingAnswers(token);
          if (wasFailing.current) {
            wasFailing.current = false;
            setRecovered(Object.keys(latest.current).length);
          }
        }
      } else if (result.status === "already_submitted") {
        router.refresh();
      } else {
        dirty.current = true;
        wasFailing.current = true;
        setSaveState("error");
      }
    } catch {
      dirty.current = true;
      wasFailing.current = true;
      setSaveState("error");
    } finally {
      inFlight.current = false;
    }
  }, [token, router]);

  // Enregistrement automatique : peu après la dernière frappe, et réessais tant que ça échoue.
  useEffect(() => {
    if (saveState !== "dirty" && saveState !== "error") return;
    const timer = setTimeout(flush, saveState === "error" ? 5000 : 1200);
    return () => clearTimeout(timer);
  }, [saveState, answers, flush]);

  // Les réponses en attente sont gardées sur l'appareil, et reprises si la page est rouverte.
  useEffect(() => {
    if (saveState === "dirty" || saveState === "error") {
      storePendingAnswers(token, latest.current);
    }
  }, [saveState, answers, token]);

  useEffect(() => {
    const restored = mergePendingAnswers(token, initialAnswers);
    if (restored) {
      latest.current = restored;
      dirty.current = true;
      /* eslint-disable react-hooks/set-state-in-effect -- réponses gardées sur l'appareil, lues après hydratation */
      setAnswers(restored);
      setSaveState("dirty");
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [token, initialAnswers]);

  // Retour du réseau : tout ce qui attend part tout de suite.
  useEffect(() => {
    if (!online || (saveState !== "error" && saveState !== "dirty")) return;
    const timer = setTimeout(() => void flush(), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // Le message « connexion rétablie » ne reste pas indéfiniment.
  useEffect(() => {
    if (recovered === null) return;
    const timer = setTimeout(() => setRecovered(null), 10_000);
    return () => clearTimeout(timer);
  }, [recovered]);

  // Un enregistrement en attente n'est jamais abandonné en silence.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current || saveState === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveState]);

  const onAnswer = (position: number, answer: StoredAnswer) => {
    const next = { ...latest.current, [String(position)]: answer };
    latest.current = next;
    dirty.current = true;
    setAnswers(next);
    setSaveState("dirty");
  };

  const submit = useCallback(async () => {
    if (submitted.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSubmitError(
        "Vous êtes hors connexion : vos réponses sont gardées sur votre téléphone. Rendez votre copie dès que le réseau revient.",
      );
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitQuiz(token, latest.current);
      if (result.status === "ok" || result.status === "already_submitted") {
        submitted.current = true;
        clearPendingAnswers(token);
        router.refresh();
        return;
      }
      setSubmitError(
        "Votre copie n’a pas pu être rendue pour l’instant. Vos réponses sont enregistrées : réessayez dans un instant.",
      );
    } catch {
      setSubmitError(
        "Votre copie n’a pas pu être rendue pour l’instant (connexion ?). Vos réponses sont enregistrées : réessayez dans un instant.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [token, router]);

  // Chrono : suit l'heure du serveur ; annonces polies à 5 min et 1 min ; remise automatique à 0.
  useEffect(() => {
    if (deadline === null) return;
    offset.current = new Date(serverNow).getTime() - Date.now();
    const tick = () => {
      const left = Math.max(0, Math.floor((deadline - Date.now() - offset.current) / 1000));
      setRemaining(left);
      const said = announcementAt(left);
      if (said) setAnnouncement(said);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline, serverNow]);

  useEffect(() => {
    if (remaining === 0 && !submitted.current && !submitting) void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  const saveText =
    saveState === "saving"
      ? "Enregistrement…"
      : saveState === "error"
        ? "Pas de connexion : votre copie reste ouverte ici, nouvel essai automatique."
        : saveState === "dirty"
          ? "Modifications en attente d’enregistrement…"
          : savedAt
            ? `Vos réponses sont enregistrées (à ${savedAt}).`
            : "Vos réponses sont enregistrées au fur et à mesure.";

  const pendingCount = Object.keys(answers).length;
  const total = questions.length;
  const current = Math.min(index, total - 1);
  const answered = (position: number) => {
    const a = answers[String(position)];
    if (!a) return false;
    if ("choices" in a) return a.choices.length > 0;
    if ("text" in a) return a.text.trim() !== "";
    return a.number.trim() !== "";
  };

  return (
    <div className="space-y-5">
      <header className="bg-background sticky top-0 z-10 space-y-2 border-b py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-heading text-xl font-bold">QCM · {title}</h1>
          {remaining !== null ? (
            <p
              role="timer"
              className="border-sky/45 bg-sky/12 text-sky rounded-full border px-3 py-1 text-sm font-bold"
            >
              Temps restant : {formatRemaining(remaining)}
            </p>
          ) : null}
        </div>
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "text-sm",
            saveState === "error" ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {saveText}
        </p>
      </header>
      <p aria-live="polite" role="status" className="sr-only">
        {announcement}
      </p>
      {saveState === "error" || !online ? (
        <div role="alert" className="border-sun/60 bg-sun/12 rounded-xl border p-3 text-sm">
          <strong>Connexion perdue.</strong>
          <p className="text-muted-foreground">
            Vos réponses sont gardées sur votre téléphone et partiront dès le retour du réseau. Le
            temps continue de tourner.
          </p>
          <p className="mt-1 font-medium">
            {pendingCount} réponse{pendingCount > 1 ? "s" : ""} en attente d’envoi
          </p>
        </div>
      ) : null}
      {recovered !== null ? (
        <p role="status" className="border-mint/50 bg-mint/12 rounded-xl border p-3 text-sm">
          <strong>Connexion rétablie.</strong> Vos {recovered} réponse{recovered > 1 ? "s" : ""} en
          attente ont été envoyées.
        </p>
      ) : null}

      <div
        role="img"
        aria-label={`Question ${current + 1} sur ${total}`}
        className="bg-muted h-2 overflow-hidden rounded-full"
      >
        <span
          className="bg-primary block h-full"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>
      <p className="text-muted-foreground text-sm" aria-hidden>
        Question {current + 1} sur {total}
      </p>

      {instructions.trim() ? (
        <details className="rounded-lg border p-3 text-sm">
          <summary className="cursor-pointer font-medium">Rappel des consignes</summary>
          <div className="mt-2">
            <Markdown source={instructions} />
          </div>
        </details>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setConfirming(true);
        }}
        className="space-y-4"
      >
        {questions.map((q, i) => (
          <div key={q.position} hidden={i !== current}>
            <QuestionView
              idPrefix={`q${q.position}`}
              label={`Question ${q.position} sur ${total}`}
              type={q.type}
              statement={q.statement}
              points={q.points}
              choices={q.choices.map((c) => ({ id: String(c.id), text: c.text }))}
              answer={answers[String(q.position)] ?? null}
              onAnswer={(a) => onAnswer(q.position, a)}
            />
          </div>
        ))}

        <nav aria-label="Questions" className="flex flex-wrap gap-1.5">
          {questions.map((q, i) => (
            <button
              key={q.position}
              type="button"
              aria-current={i === current ? "step" : undefined}
              onClick={() => setIndex(i)}
              className={cn(
                "focus-visible:ring-ring min-h-11 min-w-11 rounded-lg border text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none",
                i === current
                  ? "bg-primary text-primary-foreground border-transparent"
                  : answered(q.position)
                    ? "bg-mint/15 border-mint/40"
                    : "bg-muted/40",
              )}
            >
              {q.position}
              <span className="sr-only">
                {answered(q.position) ? " : répondue" : " : pas encore répondue"}
              </span>
            </button>
          ))}
        </nav>

        {confirming ? (
          <div
            role="group"
            aria-labelledby="confirm-title"
            className="space-y-3 rounded-lg border p-4"
          >
            <h2
              id="confirm-title"
              ref={(el) => {
                confirmRef.current = el;
                el?.focus();
              }}
              tabIndex={-1}
              className="font-medium"
            >
              Rendre votre copie ?
            </h2>
            <p className="text-sm">Une fois rendue, vous ne pourrez plus la modifier.</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={submit} disabled={submitting}>
                {submitting ? "Envoi…" : "Oui, rendre ma copie"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirming(false)}
                disabled={submitting}
              >
                Continuer à répondre
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <Button
              type="button"
              variant="secondary"
              size="touch-lg"
              disabled={current === 0}
              onClick={() => setIndex(current - 1)}
            >
              ← Précédente
            </Button>
            {current < total - 1 ? (
              <Button
                key="next"
                type="button"
                size="touch-lg"
                onClick={() => setIndex(current + 1)}
              >
                Suivante →
              </Button>
            ) : (
              <Button key="submit" type="submit" size="touch-lg">
                Rendre ma copie
              </Button>
            )}
          </div>
        )}
        {current < total - 1 && !confirming ? (
          <p>
            <Button type="submit" variant="ghost" size="touch">
              Rendre ma copie
            </Button>
          </p>
        ) : null}
        {submitError ? <ActionError error={submitError} /> : null}
      </form>
    </div>
  );
}
