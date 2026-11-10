"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  markAssessmentReady,
  publishModuleLink,
  revokeModuleLink,
  updateModuleLink,
  type ShareState,
} from "@/app/(app)/modules/[id]/frise/actions";
import { revokeResultLink } from "@/app/(app)/modules/[id]/assessments/results-links-actions";
import { StudentLinksPanel } from "@/components/modules/student-links-panel";
import type { StudentLinkRow } from "@/lib/modules/frise-queries";
import { DEFAULT_ESPACE_OPTIONS, type EspaceOptions } from "@/lib/modules/espace";
import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";

/** Lien partageable de la frise (US-130). Le lien n'est montré qu'à sa création : il n'est pas relisible. */
export interface EspaceCounts {
  brief: boolean;
  evaluations: number;
  grids: number;
  resources: number;
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export function ShareLinkPanel({
  moduleId,
  available,
  active,
  counts,
  studentLinks,
  evaluationList = [],
}: {
  moduleId: string;
  available: boolean;
  active: {
    publishedAt: string;
    viewCount: number;
    options: EspaceOptions;
    quizUrl: string | null;
    stale: boolean;
  } | null;
  studentLinks: {
    available: boolean;
    students: number;
    active: number;
    rows: StudentLinkRow[];
  };
  /** Ce que contiendrait chaque partie si elle était publiée : sert à l'aperçu. */
  counts: EspaceCounts;
  /** Évaluations du module : lesquelles partiront, lesquelles restent privées et pourquoi. */
  evaluationList?: {
    id: string;
    title: string;
    included: boolean;
    reason: string | null;
    href: string;
    /** Sujet rédigé mais au statut « À construire » : un clic le passe en « Prête ». */
    canMarkReady?: boolean;
  }[];
}) {
  const [state, setState] = useState<ShareState>({});
  const [note, setNote] = useState("");
  const [options, setOptions] = useState<EspaceOptions>(active?.options ?? DEFAULT_ESPACE_OPTIONS);
  const [quizUrl, setQuizUrl] = useState(active?.quizUrl ?? "");
  const router = useRouter();
  const [madeReady, setMadeReady] = useState<string[]>([]);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<ShareState>) {
    setNote("");
    start(async () => {
      const res = await fn();
      setState(res);
      // « Publié le … » et « Le lien n'est plus à jour » viennent de la page : on la relit.
      router.refresh();
    });
  }

  const choices: { key: keyof EspaceOptions; label: string; detail: string }[] = [
    {
      key: "brief",
      label: "Le brief du projet",
      detail: counts.brief ? "Prêt à publier" : "Rien à publier pour l’instant",
    },
    {
      key: "evaluations",
      label: "Les évaluations et leur grille",
      detail: counts.evaluations
        ? `${plural(counts.evaluations, "évaluation prête", "évaluations prêtes")}, ${plural(counts.grids, "grille", "grilles")} (les sujets « à construire » restent privés)`
        : "Aucune évaluation prête",
    },
    {
      key: "courses",
      label: "Les fiches de cours",
      detail: counts.resources
        ? `${plural(counts.resources, "fiche prête", "fiches prêtes")} pour les étudiant·es`
        : "Aucune fiche prête",
    },
  ];

  return (
    <section aria-labelledby="share" className="bg-card space-y-3 rounded-3xl border p-5 shadow-sm">
      <h2 id="share" className="font-heading text-xl font-bold">
        Publier pour les étudiant·es
      </h2>
      <p className="text-muted-foreground text-sm">
        Ce que tu coches ci-dessous part dans l’espace personnel de chaque étudiant·e (un seul lien
        par personne, plus bas). Rien d’autre : ni noms des autres, ni corrigés, ni consignes
        privées. Un lien de la classe déjà donné continue de marcher tel quel.
      </p>
      {!available ? (
        <p className="text-sm">
          Le lien partageable sera disponible après la mise à jour de la base de données.
        </p>
      ) : (
        <>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Ce qui est visible</legend>
            {choices.map((c) => (
              <label key={c.key} className="flex min-h-11 items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 size-5"
                  checked={options[c.key]}
                  onChange={(e) => setOptions({ ...options, [c.key]: e.target.checked })}
                />
                <span>
                  <strong>{c.label}</strong>
                  <span className="text-muted-foreground block">{c.detail}</span>
                </span>
              </label>
            ))}
            {evaluationList.length ? (
              <ul className="ml-8 space-y-1 text-sm" aria-label="Évaluations du module">
                {evaluationList.map((e) => (
                  <li key={e.id}>
                    <strong>{e.title}</strong> : {e.included ? "partira" : "ne partira pas"}
                    {e.reason ? ` (${e.reason})` : ""}.{" "}
                    {e.canMarkReady ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            await markAssessmentReady(moduleId, e.id);
                            setMadeReady((l) => [...l, e.title]);
                            router.refresh();
                          })
                        }
                      >
                        Passer en « Prête »<span className="sr-only"> : {e.title}</span>
                      </Button>
                    ) : e.reason ? (
                      <a href={e.href} className="underline underline-offset-2">
                        Corriger<span className="sr-only"> {e.title}</span>
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {madeReady.length > 0 ? (
              <p role="status" className="ml-8 text-sm">
                {madeReady.join(", ")} {madeReady.length > 1 ? "seront visibles" : "sera visible"}{" "}
                après la mise à jour.{" "}
                {active ? (
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      run(() => updateModuleLink(moduleId, options, quizUrl.trim() || null));
                      setMadeReady([]);
                    }}
                  >
                    Mettre à jour maintenant
                  </Button>
                ) : null}
              </p>
            ) : null}
          </fieldset>
          <div className="space-y-1">
            <label htmlFor="quiz-url" className="text-sm font-medium">
              Lien du QCM (facultatif)
            </label>
            <input
              id="quiz-url"
              type="url"
              value={quizUrl}
              onChange={(e) => setQuizUrl(e.target.value)}
              placeholder="https://…"
              className="bg-background w-full rounded-md border px-2 py-1 text-sm"
            />
            <p className="text-muted-foreground text-xs">
              Quand un QCM est ouvert, une bannière le signale ; colle ici son lien pour que le
              bouton « Passer le QCM » y mène.
            </p>
          </div>
          {active?.stale ? (
            <p role="status" className="bg-muted rounded-xl border p-3 text-sm">
              <strong>Le lien n’est plus à jour.</strong> Des séances, évaluations ou fiches ont
              changé depuis le {new Date(active.publishedAt).toLocaleDateString("fr-FR")} : mets le
              lien à jour pour que les étudiant·es voient la dernière version.{" "}
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(() => updateModuleLink(moduleId, options, quizUrl.trim() || null))
                }
              >
                Mettre à jour les cours publiés
              </Button>
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 border-t pt-4">
            {active ? (
              JSON.stringify(options) !== JSON.stringify(active.options) ||
              (quizUrl.trim() || null) !== (active.quizUrl ?? null) ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(() => updateModuleLink(moduleId, options, quizUrl.trim() || null))
                  }
                >
                  Appliquer ces choix
                </Button>
              ) : null
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(() => publishModuleLink(moduleId, options, quizUrl.trim() || null))
                }
              >
                Publier dans les espaces
              </Button>
            )}
            {active ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pending}
                onClick={() => run(() => revokeModuleLink(moduleId))}
              >
                Dépublier
              </Button>
            ) : null}
          </div>
        </>
      )}
      {active && !state.revoked ? (
        <p className="text-muted-foreground text-sm">
          Publié le {new Date(active.publishedAt).toLocaleDateString("fr-FR")} ({active.viewCount}{" "}
          consultation{active.viewCount > 1 ? "s" : ""} du lien de la classe, s’il a été donné). «
          Mettre à jour les cours publiés » publie aussi dans les espaces les notes des copies
          complètes ; une copie incomplète n’est jamais publiée.
        </p>
      ) : null}
      {/* Plus de lien de la classe à donner (doublon D29) : l'espace perso est le seul lien. */}
      <StudentLinksPanel
        moduleId={moduleId}
        available={studentLinks.available}
        students={studentLinks.students}
        active={studentLinks.active}
        rows={studentLinks.rows}
      />
      {state.revoked ? <p className="text-sm">Lien dépublié : il n’affiche plus rien.</p> : null}
      {state.url ? (
        <p role="status" className="text-sm">
          Publié dans les espaces : chaque étudiant·e le voit avec son lien personnel.
        </p>
      ) : null}
      {state.updated ? (
        <div role="status" className="space-y-2 text-sm">
          <p>
            Espace mis à jour.{" "}
            {state.notes?.published
              ? `Notes publiées pour ${state.notes.published} personne${state.notes.published > 1 ? "s" : ""}.`
              : "Aucune note à publier."}
          </p>
          {state.notes?.incomplete.length ? (
            <ul className="space-y-2">
              {state.notes.incomplete.map((c) => (
                <li
                  key={`${c.assessmentId}-${c.copy}`}
                  className="bg-muted flex flex-wrap items-center gap-2 rounded-xl border p-3"
                >
                  <span>
                    <strong>{c.title}</strong> : copie incomplète ({c.copy}), non publiée.
                  </span>
                  {c.hasOldNote ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          for (const st of c.students) {
                            await revokeResultLink(moduleId, c.assessmentId, st.id);
                          }
                          setState((prev) => ({
                            ...prev,
                            notes: prev.notes && {
                              ...prev.notes,
                              incomplete: prev.notes.incomplete.map((x) =>
                                x === c ? { ...x, hasOldNote: false } : x,
                              ),
                            },
                          }));
                          router.refresh();
                        })
                      }
                    >
                      Retirer l’ancienne note
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <p role="status" aria-live="polite" className="text-muted-foreground min-h-5 text-sm">
        {note}
      </p>
      {state.error ? <ActionError error={state.error} /> : null}
    </section>
  );
}
