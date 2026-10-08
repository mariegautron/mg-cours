"use client";

import { useState, useTransition } from "react";

import {
  publishModuleLink,
  revokeModuleLink,
  updateModuleLink,
  type ShareState,
} from "@/app/(app)/modules/[id]/frise/actions";
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
}: {
  moduleId: string;
  available: boolean;
  active: {
    publishedAt: string;
    viewCount: number;
    options: EspaceOptions;
    stale: boolean;
  } | null;
  /** Ce que contiendrait chaque partie si elle était publiée : sert à l'aperçu. */
  counts: EspaceCounts;
}) {
  const [state, setState] = useState<ShareState>({});
  const [note, setNote] = useState("");
  const [options, setOptions] = useState<EspaceOptions>(active?.options ?? DEFAULT_ESPACE_OPTIONS);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<ShareState>) {
    setNote("");
    start(async () => setState(await fn()));
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setNote("Lien copié.");
    } catch {
      setNote("Copie impossible : sélectionne le lien et copie-le.");
    }
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
        Un lien unique par module, en lecture seule : la frise, puis ce que tu coches ci-dessous.
        Rien d’autre : ni noms, ni notes obtenues, ni corrigés, ni consignes privées.
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
          </fieldset>
          {active?.stale ? (
            <p role="status" className="bg-muted rounded-xl border p-3 text-sm">
              <strong>Le lien n’est plus à jour.</strong> Des séances, évaluations ou fiches ont
              changé depuis le {new Date(active.publishedAt).toLocaleDateString("fr-FR")} : mets le
              lien à jour pour que les étudiant·es voient la dernière version.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {active ? (
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => run(() => updateModuleLink(moduleId, options))}
              >
                Mettre à jour
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => run(() => publishModuleLink(moduleId, options))}
              >
                Créer le lien
              </Button>
            )}
            {active ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => run(() => publishModuleLink(moduleId, options))}
              >
                Créer un nouveau lien
              </Button>
            ) : null}
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
      {active && !state.url && !state.revoked ? (
        <p className="text-muted-foreground text-sm">
          Un lien est actif ({active.viewCount} consultation{active.viewCount > 1 ? "s" : ""}),
          publié le {new Date(active.publishedAt).toLocaleDateString("fr-FR")}. « Mettre à jour »
          garde la même adresse ; « Créer un nouveau lien » fait cesser l’ancien.
        </p>
      ) : null}
      {state.url ? (
        <div className="space-y-2">
          <label htmlFor="share-url" className="text-sm font-medium">
            Lien à donner (visible une seule fois)
          </label>
          <div className="flex gap-2">
            <input
              id="share-url"
              readOnly
              value={state.url}
              className="bg-background min-w-0 flex-1 rounded-md border px-2 py-1 text-sm"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void copy(state.url!)}
            >
              Copier
            </Button>
          </div>
        </div>
      ) : null}
      {state.revoked ? <p className="text-sm">Lien dépublié : il n’affiche plus rien.</p> : null}
      {state.updated ? <p className="text-sm">Lien mis à jour.</p> : null}
      <p role="status" aria-live="polite" className="text-muted-foreground min-h-5 text-sm">
        {note}
      </p>
      {state.error ? <ActionError error={state.error} /> : null}
    </section>
  );
}
