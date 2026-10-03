"use client";

import { useState, useTransition } from "react";

import {
  publishModuleLink,
  revokeModuleLink,
  type ShareState,
} from "@/app/(app)/modules/[id]/frise/actions";
import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";

/** Lien partageable de la frise (US-130). Le lien n'est montré qu'à sa création : il n'est pas relisible. */
export function ShareLinkPanel({
  moduleId,
  available,
  active,
}: {
  moduleId: string;
  available: boolean;
  active: { publishedAt: string; viewCount: number } | null;
}) {
  const [state, setState] = useState<ShareState>({});
  const [note, setNote] = useState("");
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

  return (
    <section aria-labelledby="share" className="space-y-3 rounded-lg border p-4">
      <h2 id="share" className="text-lg font-medium">
        Partager la frise
      </h2>
      <p className="text-muted-foreground text-sm">
        Un lien en lecture seule pour les étudiant·es : les séances, les dates et les notes à venir.
        Rien d’autre : ni noms, ni notes obtenues, ni ressources.
      </p>
      {!available ? (
        <p className="text-sm">
          Le lien partageable sera disponible après la mise à jour de la base de données.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => run(() => publishModuleLink(moduleId))}
          >
            {active ? "Créer un nouveau lien" : "Créer le lien"}
          </Button>
          {active ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => run(() => revokeModuleLink(moduleId))}
            >
              Révoquer le lien
            </Button>
          ) : null}
        </div>
      )}
      {active && !state.url && !state.revoked ? (
        <p className="text-muted-foreground text-sm">
          Un lien est actif ({active.viewCount} consultation{active.viewCount > 1 ? "s" : ""}). Pour
          le revoir, crées-en un nouveau : l’ancien cessera de fonctionner.
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
      {state.revoked ? <p className="text-sm">Lien révoqué.</p> : null}
      <p role="status" aria-live="polite" className="text-muted-foreground min-h-5 text-sm">
        {note}
      </p>
      {state.error ? <ActionError error={state.error} /> : null}
    </section>
  );
}
