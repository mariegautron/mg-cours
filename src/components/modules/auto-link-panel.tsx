"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { applyAutoLinks } from "@/app/(app)/modules/[id]/matching/actions";
import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";
import type { AutoLinkProposal } from "@/lib/modules/matching";
import { plural } from "@/lib/plural";

/**
 * Modules d'avant les liens explicites : des ressources sont retenues pour le module sans être
 * associées à un attendu. Rien n'est lié en silence : aperçu, confirmation, puis application.
 */
export function AutoLinkPanel({
  moduleId,
  proposals,
}: {
  moduleId: string;
  proposals: AutoLinkProposal[];
}) {
  const id = useId();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const apply = () =>
    start(async () => {
      const result = await applyAutoLinks(moduleId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError("");
      setOpen(false);
      setDone(result.done ?? "");
      router.refresh();
    });

  if (proposals.length === 0) {
    return done ? (
      <p role="status" className="text-sm">
        {done}
      </p>
    ) : null;
  }

  return (
    <section aria-labelledby={`${id}-title`} className="bg-card space-y-3 rounded-3xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id={`${id}-title`} className="font-heading text-base font-bold">
            {plural(proposals.length, "attendu")} à rapprocher
          </h2>
          <p className="text-muted-foreground text-sm">
            Des ressources sont déjà retenues pour le module sans être associées à un attendu en
            particulier. Rien n’est associé tout seul.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          aria-expanded={open}
          aria-controls={`${id}-preview`}
          onClick={() => setOpen((v) => !v)}
        >
          Reprendre le rapprochement automatique
        </Button>
      </div>
      {open ? (
        <div id={`${id}-preview`} className="space-y-3">
          <p className="text-sm font-medium">
            Aperçu : la meilleure ressource retenue pour chaque attendu
          </p>
          <ul className="space-y-2">
            {proposals.map((p) => (
              <li key={p.expectationId} className="rounded-xl border p-3 text-sm">
                <p className="line-clamp-2">{p.label}</p>
                <p className="text-muted-foreground">
                  → {p.title} (correspondance {p.percent} %)
                </p>
              </li>
            ))}
          </ul>
          {error ? <ActionError error={error} /> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={apply}>
              {pending ? "Rapprochement…" : "Confirmer le rapprochement"}
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
              Annuler
            </Button>
          </div>
        </div>
      ) : null}
      <p role="status" className="text-sm">
        {done}
      </p>
    </section>
  );
}
