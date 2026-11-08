"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { setCorrectionMode } from "@/app/(app)/modules/[id]/assessments/[assessmentId]/correct/open-actions";
import { Button } from "@/components/ui/button";

/**
 * Choix explicite de Marie : corriger ce QCM comme des questions ouvertes tirées au sort (relecture
 * réponse par réponse, palier A à D, commentaires). Aucune note existante ne change en basculant.
 */
export function CorrectionMode({
  moduleId,
  assessmentId,
  mode,
}: {
  moduleId: string;
  assessmentId: string;
  mode: "classic" | "open_questions";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const open = mode === "open_questions";

  return (
    <section aria-labelledby="corr-mode" className="bg-muted/40 space-y-2 rounded-xl border p-4">
      <h2 id="corr-mode" className="font-heading text-lg font-bold">
        Façon de corriger
      </h2>
      <p className="text-sm">
        {open
          ? "Questions ouvertes tirées au sort : tu relis les réponses, tu retiens un palier A à D et tu commentes chaque question."
          : "Correction classique : copie par copie, points des questions libres."}{" "}
        Changer de mode ne modifie aucune note déjà écrite.
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => {
          const target = open ? "classique" : "questions ouvertes";
          if (
            !window.confirm(
              `Passer cette évaluation en correction « ${target} » ? Aucune note existante ne change.`,
            )
          )
            return;
          start(async () => {
            const res = await setCorrectionMode(
              moduleId,
              assessmentId,
              open ? "classic" : "open_questions",
            );
            setError(res.error ?? null);
            router.refresh();
          });
        }}
      >
        {open ? "Revenir à la correction classique" : "Corriger en questions ouvertes"}
      </Button>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </section>
  );
}
