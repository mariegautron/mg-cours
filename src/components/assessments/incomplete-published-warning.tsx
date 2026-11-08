"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { revokeResultLink } from "@/app/(app)/modules/[id]/assessments/results-links-actions";
import { Button } from "@/components/ui/button";

export interface PublishedIncomplete {
  key: string;
  name: string;
  students: { id: string; name: string }[];
}

/**
 * Alerte : des résultats sont publiés pour une copie qui n'est plus (ou pas) complète. Rien n'est
 * dépublié automatiquement : Marie révoque le lien, puis le republie une fois la copie finie.
 */
export function IncompletePublishedWarning({
  moduleId,
  assessmentId,
  copies,
}: {
  moduleId: string;
  assessmentId: string;
  copies: PublishedIncomplete[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (copies.length === 0) return null;

  return (
    <section
      role="alert"
      aria-labelledby="inc-pub"
      className="border-sun/50 bg-sun/10 space-y-2 rounded-xl border p-4"
    >
      <h2 id="inc-pub" className="font-semibold">
        Résultats publiés pour une copie incomplète
      </h2>
      <p className="text-sm">
        Ces personnes peuvent voir, dans leur espace, une note calculée sur une correction pas
        finie. Retire la note des espaces, termine la copie, puis republie.
      </p>
      <ul className="space-y-1 text-sm">
        {copies.map((c) => (
          <li key={c.key} className="flex flex-wrap items-center gap-2">
            <strong>{c.name}</strong>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  let message: string | null = null;
                  for (const s of c.students) {
                    const state = await revokeResultLink(moduleId, assessmentId, s.id);
                    message = message ?? state.error ?? null;
                  }
                  setError(message);
                  router.refresh();
                })
              }
            >
              Retirer cette note des espaces
              <span className="sr-only"> : {c.name}</span>
            </Button>
          </li>
        ))}
      </ul>
      {error ? <p className="text-sm font-medium">{error}</p> : null}
    </section>
  );
}
