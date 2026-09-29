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
export function OralTimer({ durationMinutes }: { durationMinutes: number }) {
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

  return (
    <section aria-labelledby="oral-timer-title" className="space-y-3 rounded-lg border p-4">
      <h3 id="oral-timer-title" className="font-medium">
        Chronomètre — {durationMinutes} min
      </h3>
      <p
        role="timer"
        aria-live="off"
        aria-label="Temps restant"
        className={cn(
          "font-mono text-6xl font-semibold tabular-nums",
          tone,
          view.phase === "warning" && "motion-safe:animate-pulse",
        )}
      >
        {view.label}
      </p>
      <p className="text-sm font-medium">
        {view.phase === "warning" ? "Dernière minute." : null}
        {view.phase === "over" ? "Temps écoulé." : null}
        {view.phase === "paused" ? "En pause." : null}
        {view.phase === "idle" ? "Prêt à démarrer." : null}
        {view.phase === "running" ? "En cours." : null}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={toggle}>
          {running ? <Pause aria-hidden /> : <Play aria-hidden />}
          {running ? "Pause" : view.phase === "idle" ? "Démarrer" : "Reprendre"}
        </Button>
        <Button type="button" variant="outline" onClick={reset} disabled={view.phase === "idle"}>
          <RotateCcw aria-hidden />
          Remettre à zéro
        </Button>
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {polite}
      </div>
      <div role="alert" className="text-destructive text-sm font-medium">
        {alert}
      </div>
    </section>
  );
}
