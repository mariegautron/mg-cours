"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Presentation } from "lucide-react";

import type { PresentSlide } from "@/components/present/present-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  clampIndex,
  clockInParis,
  minutesInParis,
  parseSyncMessage,
  remainingLabel,
} from "@/lib/present/sync";

export interface TeacherResource {
  id: string;
  title: string;
  kindLabel: string | null;
  /** Ressource pas encore prête : jamais projetée. */
  toBuild: boolean;
}

function subscribeMinute(onChange: () => void) {
  const timer = window.setInterval(onChange, 10_000);
  return () => window.clearInterval(timer);
}
const minuteSnapshot = () => String(minutesInParis());
const serverSnapshot = () => "";

/**
 * US-64 : vue présentatrice, dans une seconde fenêtre. Elle suit la fenêtre projetée (même
 * origine, BroadcastChannel) et la pilote : diapositive courante et suivante, notes de séance,
 * ressources « Enseignante uniquement » (corrigés), heure et temps restant.
 * Rien de ce qui est affiché ici ne part vers la fenêtre projetée : seuls des indices circulent.
 */
export function PresenterView({
  title,
  backHref,
  slides,
  syncChannel,
  projectedHref,
  notes,
  teacherResources,
  endTime,
}: {
  title: string;
  backHref: string;
  slides: PresentSlide[];
  syncChannel: string;
  projectedHref: string;
  notes: { label: string; text: string }[];
  teacherResources: TeacherResource[];
  /** Heure de fin (`HH:MM`) pour le temps restant, seulement le jour de la séance. */
  endTime: string | null;
}) {
  const total = slides.length;
  const [index, setIndex] = useState(0);
  const [channel, setChannel] = useState<BroadcastChannel | null>(null);
  const minutes = useSyncExternalStore(subscribeMinute, minuteSnapshot, serverSnapshot);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const bc = new BroadcastChannel(syncChannel);
    bc.onmessage = (event) => {
      const message = parseSyncMessage(event.data);
      if (message?.type === "state") setIndex(clampIndex(message.index, total));
    };
    // Reprendre là où en est la fenêtre projetée, si elle est ouverte.
    bc.postMessage({ type: "hello" });
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- canal ouvert après montage */
    setChannel(bc);
    return () => bc.close();
  }, [syncChannel, total]);

  const go = useCallback(
    (next: number) => {
      const target = clampIndex(next, total);
      setIndex(target);
      channel?.postMessage({ type: "go", index: target });
    },
    [channel, total],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
        return;
      }
      const key = e.key.toLowerCase();
      if (["arrowright", "pagedown", " "].includes(key)) go(index + 1);
      else if (["arrowleft", "pageup"].includes(key)) go(index - 1);
      else if (key === "home") go(0);
      else if (key === "end") go(total - 1);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, total]);

  const current = slides[index];
  const next = slides[index + 1];
  const clock = minutes ? clockInParis() : "";
  const remaining = minutes ? remainingLabel(Number(minutes), endTime) : null;

  return (
    <div className="bg-background text-foreground flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-2">
        <Button asChild variant="ghost" size="touch">
          <Link href={backHref}>Quitter la vue présentatrice</Link>
        </Button>
        <h1 className="text-muted-foreground min-w-0 flex-1 truncate text-sm font-medium">
          Vue présentatrice · {title}
        </h1>
        <Button asChild variant="ghost" size="touch">
          <a href={projectedHref} target="_blank" rel="noreferrer">
            <Presentation aria-hidden />
            Ouvrir la fenêtre projetée
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
        </Button>
        <div className="text-right tabular-nums">
          <p className="text-2xl leading-none font-semibold" aria-label="Heure à Paris">
            {clock}
          </p>
          {remaining ? <p className="text-muted-foreground text-sm">{remaining}</p> : null}
        </div>
      </header>

      <main className="grid flex-1 gap-4 p-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <section aria-labelledby="pv-current" className="space-y-2">
            <h2 id="pv-current" className="text-sm font-medium">
              Diapositive {total ? index + 1 : 0} sur {total}
              {current?.label ? ` : ${current.label}` : ""}
            </h2>
            <div className="max-h-[55vh] overflow-auto rounded-lg border p-4">
              <div style={{ zoom: 0.5 }}>{current?.node}</div>
            </div>
          </section>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="touch-lg"
              disabled={index === 0}
              onClick={() => go(index - 1)}
            >
              <ChevronLeft aria-hidden />
              Précédente
            </Button>
            <Button
              type="button"
              size="touch-lg"
              disabled={index >= total - 1}
              onClick={() => go(index + 1)}
            >
              Suivante
              <ChevronRight aria-hidden />
            </Button>
            <p aria-live="polite" className="text-muted-foreground text-sm">
              Affichée à l’écran : diapositive {index + 1}
            </p>
          </div>

          <section aria-labelledby="pv-next" className="space-y-2">
            <h2 id="pv-next" className="text-sm font-medium">
              {next ? `Ensuite${next.label ? ` : ${next.label}` : ""}` : "Dernière diapositive"}
            </h2>
            {next ? (
              <div className="max-h-40 overflow-hidden rounded-lg border p-3 opacity-80">
                <div style={{ zoom: 0.3 }}>{next.node}</div>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="space-y-4">
          <section aria-labelledby="pv-notes" className="space-y-2 rounded-lg border p-4">
            <h2 id="pv-notes" className="font-medium">
              Notes de séance
            </h2>
            {notes.length ? (
              <dl className="space-y-3 text-sm">
                {notes.map((n) => (
                  <div key={n.label}>
                    <dt className="text-muted-foreground font-medium">{n.label}</dt>
                    <dd className="whitespace-pre-wrap">{n.text}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-muted-foreground text-sm">Aucune note pour cette séance.</p>
            )}
          </section>

          <section aria-labelledby="pv-teacher" className="space-y-2 rounded-lg border p-4">
            <h2 id="pv-teacher" className="font-medium">
              Enseignante uniquement
            </h2>
            {teacherResources.length ? (
              <ul className="space-y-2 text-sm">
                {teacherResources.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2">
                    <a
                      href={`/resources/${r.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
                    >
                      {r.title}
                      <ExternalLink aria-hidden className="size-3.5" />
                      <span className="sr-only"> (nouvel onglet)</span>
                    </a>
                    {r.kindLabel ? <Badge variant="secondary">{r.kindLabel}</Badge> : null}
                    {r.toBuild ? <Badge variant="outline">À construire</Badge> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                Aucun corrigé ni support réservé pour cette séance.
              </p>
            )}
            <p className="text-muted-foreground text-xs">
              Ces ressources ne sont jamais projetées.
            </p>
          </section>
        </aside>
      </main>
    </div>
  );
}
