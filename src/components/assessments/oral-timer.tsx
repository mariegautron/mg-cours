"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  dueAnnouncement,
  elapsedMs,
  INITIAL_CLOCK,
  pauseClock,
  startClock,
  timerAnnouncements,
  timerView,
  type TimerClock,
} from "@/lib/assessments/oral-timer";
import { cn } from "@/lib/utils";

/**
 * Chronomètre d'un passage (US-92). Le temps est lu sur l'horloge, pas compté par tick. L'affichage
 * n'est pas annoncé seconde par seconde (`role="timer"` reste silencieux) : seules quelques annonces
 * polies (5 minutes, temps écoulé) et l'alerte de la dernière minute passent par les zones dédiées.
 * Aucune animation hors `motion-safe`.
 */
export function OralTimer({
  durationMinutes,
  onStart,
}: {
  durationMinutes: number;
  onStart?: () => void;
}) {
  const durationSeconds = durationMinutes * 60;
  const announcements = useRef(timerAnnouncements(durationSeconds));
  const said = useRef(new Set<number>());
  const [clock, setClock] = useState<TimerClock>(INITIAL_CLOCK);
  const [now, setNow] = useState(() => Date.now());
  const [polite, setPolite] = useState("");
  const [alert, setAlert] = useState("");

  const running = clock.startedAt !== null;
  const view = timerView({
    durationSeconds,
    elapsedMs: elapsedMs(clock, now),
    running,
  });

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const due = dueAnnouncement(announcements.current, view.remainingSeconds, said.current);
    if (!due) return;
    // Un seuil franchi d'un coup en couvre aussi les précédents (onglet réveillé).
    for (const a of announcements.current) {
      if (a.atRemainingSeconds >= due.atRemainingSeconds) said.current.add(a.atRemainingSeconds);
    }
    if (due.level === "alert") setAlert(due.message);
    else setPolite(due.message);
  }, [running, view.remainingSeconds]);

  function toggle() {
    const t = Date.now();
    setNow(t);
    if (running) {
      setClock((c) => pauseClock(c, t));
      setPolite("Chronomètre en pause.");
    } else {
      if (view.phase === "idle") onStart?.();
      setClock((c) => startClock(c, t));
      setPolite(
        view.phase === "idle"
          ? `Chronomètre lancé : ${durationMinutes} minutes.`
          : "Chronomètre relancé.",
      );
    }
  }

  function reset() {
    setClock(INITIAL_CLOCK);
    setNow(Date.now());
    said.current = new Set();
    setAlert("");
    setPolite("Chronomètre remis à zéro.");
  }

  const tone =
    view.phase === "over"
      ? "text-destructive"
      : view.phase === "warning"
        ? "text-destructive"
        : "text-foreground";

  const status =
    view.phase === "warning"
      ? "Dernière minute"
      : view.phase === "over"
        ? "Temps écoulé"
        : view.phase === "paused"
          ? "En pause"
          : view.phase === "idle"
            ? "Prêt à démarrer"
            : "En cours";

  return (
    <section
      aria-labelledby="oral-timer-title"
      className={cn(
        // Une seule ligne, collée en haut : le chrono reste visible sans cacher la grille.
        "bg-background/95 sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border px-3 py-1.5 backdrop-blur",
        view.phase === "warning" && "border-destructive bg-destructive/15 border-2",
        view.phase === "over" && "border-destructive bg-destructive/25 border-2",
      )}
    >
      <h3 id="oral-timer-title" className="sr-only">
        Chronomètre — {durationMinutes} min
      </h3>
      <p
        role="timer"
        aria-live="off"
        aria-label="Temps restant"
        className={cn(
          "font-mono text-3xl leading-none font-semibold tabular-nums",
          tone,
          view.phase === "warning" && "motion-safe:animate-pulse",
        )}
      >
        {view.label}
      </p>
      <p className="text-sm font-medium">
        {status}
        <span className="text-muted-foreground font-normal"> · {durationMinutes} min</span>
      </p>
      <div className="ml-auto flex gap-2">
        <Button type="button" size="sm" onClick={toggle}>
          {running ? <Pause aria-hidden /> : <Play aria-hidden />}
          {running ? "Pause" : view.phase === "idle" ? "Démarrer" : "Reprendre"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={reset}
          disabled={view.phase === "idle"}
          aria-label="Remettre à zéro"
        >
          <RotateCcw aria-hidden />
        </Button>
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {polite}
      </div>
      <div
        role="alert"
        className={alert ? "text-destructive w-full text-sm font-medium" : "sr-only"}
      >
        {alert}
      </div>
    </section>
  );
}
