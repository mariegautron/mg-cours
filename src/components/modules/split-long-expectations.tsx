"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { splitLongExpectations } from "@/app/(app)/modules/[id]/expectations/actions";
import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";
import type { SplitPlan } from "@/lib/modules/expectations";
import { plural } from "@/lib/plural";

/**
 * « Découper les attendus trop longs » : aperçu du découpage, confirmation, application en une
 * action. Le premier fragment garde l'attendu et ses rapprochements ; les autres sont créés sans lien.
 */
export function SplitLongExpectations({
  moduleId,
  plans,
}: {
  moduleId: string;
  plans: SplitPlan[];
}) {
  const id = useId();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const apply = () =>
    start(async () => {
      const result = await splitLongExpectations(moduleId);
      if (!result.ok) {
        setError(result.error ?? "On n’a pas pu découper les attendus.");
        return;
      }
      setError("");
      setOpen(false);
      setDone(
        `${plural(result.count ?? 0, "attendu")} découpé${(result.count ?? 0) > 1 ? "s" : ""}. Tes rapprochements existants sont conservés.`,
      );
      router.refresh();
    });

  if (plans.length === 0) {
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
            {plural(plans.length, "attendu")} à découper
          </h2>
          <p className="text-muted-foreground text-sm">
            Ces attendus regroupent plusieurs idées dans un même texte (la lecture de la fiche les a
            collées).
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          aria-expanded={open}
          aria-controls={`${id}-preview`}
          onClick={() => setOpen((v) => !v)}
        >
          Découper les attendus trop longs
        </Button>
      </div>
      {open ? (
        <div id={`${id}-preview`} className="space-y-3">
          <p className="text-sm font-medium">Aperçu du découpage</p>
          <ul className="space-y-3">
            {plans.map((p) => (
              <li key={p.id} className="rounded-xl border p-3 text-sm">
                <p className="text-muted-foreground line-clamp-2 text-xs">{p.label}</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {p.parts.map((part, i) => (
                    <li key={i}>
                      {part}
                      {i === 0 ? (
                        <span className="text-muted-foreground"> (garde ses liens)</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-sm">
            Le premier fragment garde l’attendu et ses rapprochements ; les autres sont créés sans
            lien, juste après. Tu pourras les corriger ensuite.
          </p>
          {error ? <ActionError error={error} /> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={apply}>
              {pending ? "Découpage…" : "Confirmer le découpage"}
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
