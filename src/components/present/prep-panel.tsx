"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";

import {
  recordKeptForMe,
  saveHiddenKeys,
} from "@/app/(app)/modules/[id]/courses/[courseId]/start/actions";
import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import { defaultHiddenKeys, projectedCount, type PrepItem } from "@/lib/present/items";
import { withHidden } from "@/lib/present/plan";
import {
  QCM_DEFAULT_LIMIT,
  QCM_LIMIT_OPTIONS,
  qcmLimitLabel,
  serializeQcmLimit,
  withQcmLimit,
} from "@/lib/present/qcm";

const card = "bg-card rounded-3xl border p-5 shadow-sm";
const EDUSIGN = "https://edusign.app/professor/home";

function readHidden(courseId: string, fallback: Set<string>): Set<string> {
  try {
    const raw = window.localStorage.getItem(`mg-hidden-${courseId}`);
    if (raw === null) return fallback;
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(
      Array.isArray(list) ? list.filter((k): k is string => typeof k === "string") : [],
    );
  } catch {
    return fallback;
  }
}

function readQcmLimit(): number | null {
  try {
    const raw = window.localStorage.getItem("mg-qcm-limit");
    const match = QCM_LIMIT_OPTIONS.find((o) => serializeQcmLimit(o) === raw);
    return match === undefined ? QCM_DEFAULT_LIMIT : match;
  } catch {
    return QCM_DEFAULT_LIMIT;
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
  storedHidden,
  seanceLabel,
}: {
  moduleId: string;
  courseId: string;
  items: PrepItem[];
  /** Choix « Pour moi » déjà enregistrés avec la séance (`null` : aucun choix fait). */
  storedHidden: string[] | null;
  seanceLabel: string;
}) {
  const router = useRouter();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [calledDone, setCalledDone] = useState(false);
  const [ready, setReady] = useState(false);
  const [qcmLimit, setQcmLimit] = useState<number | null>(QCM_DEFAULT_LIMIT);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- préférences locales lues après hydratation */
    const initial = storedHidden
      ? new Set(storedHidden)
      : readHidden(courseId, defaultHiddenKeys(items));
    setHidden(initial);
    // Aucun choix enregistré avec la séance : ce que l'écran montre devient ce que toute
    // ouverture de la projection (carnet, adresse…) applique, même si le choix venait d'avant.
    if (storedHidden === null) {
      const known = new Set(items.map((i) => i.key));
      void saveHiddenKeys(
        courseId,
        [...initial].filter((k) => known.has(k)),
      );
    }
    try {
      setCalledDone(window.localStorage.getItem(`mg-appel-${courseId}`) === "1");
    } catch {
      /* stockage indisponible */
    }
    setQcmLimit(readQcmLimit());
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lu une fois par séance, après hydratation
  }, [courseId]);

  function persistHidden(next: Set<string>) {
    setHidden(next);
    try {
      window.localStorage.setItem(`mg-hidden-${courseId}`, JSON.stringify([...next]));
    } catch {
      /* ignoré */
    }
    void saveHiddenKeys(courseId, [...next]);
  }

  /** Un seul geste : ouvre la fenêtre projetée (à part) et la vue privée (ici). */
  function start() {
    window.open(projectedHref, `mg-projection-${courseId}`);
    void recordKeptForMe(courseId, kept);
    void saveHiddenKeys(courseId, kept);
    router.push(privateHref);
  }

  function setMode(key: string, project: boolean) {
    const next = new Set(hidden);
    if (project) next.delete(key);
    else next.add(key);
    persistHidden(next);
  }

  function changeQcmLimit(limit: number | null) {
    setQcmLimit(limit);
    try {
      window.localStorage.setItem("mg-qcm-limit", serializeQcmLimit(limit));
    } catch {
      /* ignoré */
    }
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
  const projectedHref = withQcmLimit(withHidden(base, kept), qcmLimit);
  const privateHref = withQcmLimit(withHidden(`${base}/presenter`, kept), qcmLimit);
  const hasQcm = items.some((i) => i.key.startsWith("qcm:"));
  const count = projectedCount(items, new Set(kept));

  return (
    <div className="space-y-5">
      <div className="bg-card flex flex-wrap items-center gap-3 rounded-3xl border p-4 shadow-sm">
        <Button type="button" size="touch-lg" onClick={start}>
          Commencer le cours
          <span className="sr-only">
            {" "}
            : {seanceLabel}. Ouvre la fenêtre projetée dans une nouvelle fenêtre et ta vue privée
          </span>
        </Button>
        <p className="text-muted-foreground min-w-0 flex-1 text-sm">
          Ouvre la fenêtre projetée (à glisser sur le vidéoprojecteur) et ta vue privée. Les deux
          avancent ensemble.
        </p>
      </div>
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
                  className="bg-muted/50 grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-xl px-3.5 py-2.5"
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
                      className="col-start-2 grid w-48 max-w-full grid-cols-2 overflow-hidden rounded-lg border"
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
                    <Pill tone="warn" className="col-start-2 justify-self-start">
                      {item.lockLabel}
                    </Pill>
                  )}
                </li>
              );
            })}
          </ol>
          {hasQcm ? (
            <fieldset className="mt-4 rounded-xl border p-3.5">
              <legend className="px-1 font-semibold">Mini-QCM : questions par fiche</legend>
              <div className="flex flex-wrap gap-2">
                {QCM_LIMIT_OPTIONS.map((option) => (
                  <label
                    key={serializeQcmLimit(option)}
                    className="has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:focus-visible]:ring-ring flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold has-[:focus-visible]:ring-2"
                  >
                    <input
                      type="radio"
                      name="qcm-limit"
                      className="sr-only"
                      checked={qcmLimit === option}
                      onChange={() => changeQcmLimit(option)}
                    />
                    {qcmLimitLabel(option)}
                  </label>
                ))}
              </div>
              <p className="text-muted-foreground mt-2 text-[0.8rem]">
                Les premières questions de chaque fiche sont projetées, une question puis sa
                correction. Les mini-QCM se projettent en mode Diapositives.
              </p>
            </fieldset>
          ) : null}
          <p className="text-muted-foreground mt-3 text-[0.8rem]">
            Un élément « Pour moi » reste dans ta vue privée. Les fiches « pour aller plus loin » et
            les corrigés sont « Pour moi » tant que tu n’as pas choisi ; ce qui est « à construire »
            ne peut pas être projeté.
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
              Il se fait dans Edusign : les étudiant·es signent depuis leur téléphone. Ce lien
              s’ouvre dans un nouvel onglet.
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
              Si tu fermes la fenêtre projetée
            </h2>
            <div className="space-y-2.5">
              <div className="rounded-xl border p-3.5">
                <strong>La fenêtre projetée</strong>
                <p className="text-muted-foreground mt-0.5 mb-2.5 text-sm">
                  Ce que voient les étudiant·es. Glisse-la sur le vidéoprojecteur, puis clique sur
                  « Plein écran ».
                </p>
                <Button asChild variant="secondary">
                  <Link href={projectedHref} target={`mg-projection-${courseId}`}>
                    Rouvrir la fenêtre projetée
                    <span className="sr-only"> (nouvelle fenêtre)</span>
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
