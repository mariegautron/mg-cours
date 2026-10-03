"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { recordKeptForMe } from "@/app/(app)/modules/[id]/courses/[courseId]/start/actions";
import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import { projectedCount, type PrepItem } from "@/lib/present/items";
import { withHidden } from "@/lib/present/plan";

const card = "bg-card rounded-3xl border p-5 shadow-sm";
const EDUSIGN = "https://edusign.app/professor/home";

function readHidden(courseId: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(`mg-hidden-${courseId}`);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(
      Array.isArray(list) ? list.filter((k): k is string => typeof k === "string") : [],
    );
  } catch {
    return new Set();
  }
}

/**
 * « Avant de commencer » (maquette Affichage) : pour chaque élément du déroulé, projeter ou garder
 * « pour moi » ; l'appel dans Edusign ; les deux fenêtres (projetée, vue privée). Le choix part dans
 * l'adresse des deux fenêtres, il est aussi retenu sur cet appareil pour la prochaine fois.
 */
export function PrepPanel({
  moduleId,
  courseId,
  items,
  seanceLabel,
}: {
  moduleId: string;
  courseId: string;
  items: PrepItem[];
  seanceLabel: string;
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [calledDone, setCalledDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- préférences locales lues après hydratation */
    setHidden(readHidden(courseId));
    try {
      setCalledDone(window.localStorage.getItem(`mg-appel-${courseId}`) === "1");
    } catch {
      /* stockage indisponible */
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [courseId]);

  function persistHidden(next: Set<string>) {
    setHidden(next);
    try {
      window.localStorage.setItem(`mg-hidden-${courseId}`, JSON.stringify([...next]));
    } catch {
      /* ignoré */
    }
  }

  function setMode(key: string, project: boolean) {
    const next = new Set(hidden);
    if (project) next.delete(key);
    else next.add(key);
    persistHidden(next);
  }

  function toggleCalled(on: boolean) {
    setCalledDone(on);
    try {
      window.localStorage.setItem(`mg-appel-${courseId}`, on ? "1" : "0");
    } catch {
      /* ignoré */
    }
  }

  const known = new Set(items.map((i) => i.key));
  const kept = [...hidden].filter((k) => known.has(k));
  const base = `/present/modules/${moduleId}/courses/${courseId}`;
  const projectedHref = withHidden(base, kept);
  const privateHref = withHidden(`${base}/presenter`, kept);
  const count = projectedCount(items, new Set(kept));

  return (
    <div className="flex flex-wrap items-start gap-5 lg:flex-nowrap">
      <section aria-labelledby="deroule" className={`${card} w-full min-w-0 flex-1 lg:basis-0`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="deroule" className="font-heading text-xl font-bold">
            Le déroulé de la séance
          </h2>
          <Pill tone="ok">
            <span role="status">
              {count} élément{count > 1 ? "s" : ""} projeté{count > 1 ? "s" : ""}
            </span>
          </Pill>
        </div>
        <ol className="space-y-2">
          {items.map((item, i) => {
            const projectIt = !hidden.has(item.key);
            return (
              <li
                key={item.key}
                className="bg-muted/50 grid items-center gap-3 rounded-xl px-3.5 py-2.5 sm:grid-cols-[2rem_minmax(0,1fr)_12rem]"
              >
                <span
                  aria-hidden
                  className="text-muted-foreground flex size-8 items-center justify-center rounded-full border text-[0.8rem] font-bold"
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <strong>{item.label}</strong>
                  {item.badge ? (
                    <Pill tone={item.badge.tone} className="ml-2">
                      {item.badge.label}
                    </Pill>
                  ) : null}
                  {item.detail ? (
                    <div className="text-muted-foreground text-[0.8rem]">{item.detail}</div>
                  ) : null}
                </div>
                {item.mode === "toggle" ? (
                  <div
                    role="group"
                    aria-label={item.label}
                    className="grid grid-cols-2 overflow-hidden rounded-lg border"
                  >
                    {(
                      [
                        [true, "Projeter"],
                        [false, "Pour moi"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={label}
                        type="button"
                        aria-pressed={ready ? projectIt === value : value}
                        onClick={() => setMode(item.key, value)}
                        className={`focus-visible:ring-ring min-h-11 text-[0.8rem] font-semibold focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset ${
                          (ready ? projectIt === value : value)
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-accent"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Pill tone="warn" className="justify-self-end">
                    {item.lockLabel}
                  </Pill>
                )}
              </li>
            );
          })}
        </ol>
        <p className="text-muted-foreground mt-3 text-[0.8rem]">
          Un élément « Pour moi » reste dans ta vue privée. Les corrigés et ce qui est « à
          construire » ne peuvent pas être projetés.
        </p>
      </section>

      <div className="w-full min-w-0 space-y-4 lg:w-[28rem] lg:flex-none">
        <section aria-labelledby="ap" className={card}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h2 id="ap" className="font-heading text-xl font-bold">
              L’appel
            </h2>
            <Pill tone={calledDone ? "ok" : "warn"}>{calledDone ? "Fait" : "À faire"}</Pill>
          </div>
          <p className="text-muted-foreground mb-3 text-sm">
            Il se fait dans Edusign : les étudiant·es signent depuis leur téléphone. Ce lien s’ouvre
            dans un nouvel onglet.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild variant="secondary">
              <a href={EDUSIGN} target="_blank" rel="noopener noreferrer">
                Ouvrir Edusign
                <ExternalLink aria-hidden />
                <span className="sr-only"> — s’ouvre dans un nouvel onglet</span>
              </a>
            </Button>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={calledDone}
                onChange={(e) => toggleCalled(e.target.checked)}
                className="size-5"
              />
              Appel fait
            </label>
          </div>
        </section>

        <section aria-labelledby="fen" className={card}>
          <h2 id="fen" className="font-heading mb-3 text-xl font-bold">
            Tes deux fenêtres
          </h2>
          <div className="space-y-2.5">
            <div className="rounded-xl border p-3.5">
              <strong>1 · La fenêtre projetée</strong>
              <p className="text-muted-foreground mt-0.5 mb-2.5 text-sm">
                Ce que voient les étudiant·es. Glisse-la sur le vidéoprojecteur, puis touche F pour
                le plein écran.
              </p>
              <Button asChild variant="secondary">
                <Link href={projectedHref} target={`mg-projection-${courseId}`}>
                  Ouvrir la fenêtre projetée
                  <span className="sr-only"> (nouvelle fenêtre)</span>
                </Link>
              </Button>
            </div>
            <div className="rounded-xl border p-3.5">
              <strong>2 · Ta vue privée</strong>
              <p className="text-muted-foreground mt-0.5 mb-2.5 text-sm">
                Sur ton portable : notes, corrigés, chrono et carnet. Jamais projetée.
              </p>
              <Button asChild variant="secondary">
                <Link href={privateHref}>Ouvrir ma vue privée</Link>
              </Button>
            </div>
          </div>
        </section>

        <section aria-labelledby="pr" className={card}>
          <h2 id="pr" className="font-heading mb-1 text-xl font-bold">
            Prêt·e ?
          </h2>
          <p className="text-muted-foreground mb-3 text-sm">
            Les deux fenêtres avancent ensemble : tu changes de diapositive d’un côté, l’autre suit.
          </p>
          <Button asChild className="w-full">
            <Link href={privateHref} onClick={() => void recordKeptForMe(courseId, kept)}>
              Commencer le cours
              <span className="sr-only"> : {seanceLabel}</span>
            </Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
