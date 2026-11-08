"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { refreshPublishedResults } from "@/app/(app)/modules/[id]/assessments/results-links-actions";
import { Button } from "@/components/ui/button";

/**
 * Bandeau : des notes ont changé APRÈS leur publication, l'espace montre encore l'ancienne version.
 * Un bouton remet à jour ces notes seulement (aucun nouveau lien, rien à voir avec la frise).
 */
export function RepublishNotice({
  moduleId,
  assessmentId,
  names,
}: {
  moduleId: string;
  assessmentId: string;
  names: string[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (names.length === 0) return null;
  return (
    <section role="status" className="bg-muted space-y-2 rounded-xl border p-4 text-sm">
      <p>
        <strong>
          {names.length} note{names.length > 1 ? "s ont" : " a"} changé depuis la publication
        </strong>{" "}
        ({names.slice(0, 4).join(", ")}
        {names.length > 4 ? "…" : ""}) : l’espace montre encore l’ancienne version.
      </p>
      <Button
        type="button"
        size="touch"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await refreshPublishedResults(moduleId, assessmentId);
            setError(res.error ?? null);
            router.refresh();
          })
        }
      >
        Mettre à jour les notes publiées
      </Button>
      {error ? <p className="font-medium">{error}</p> : null}
    </section>
  );
}
