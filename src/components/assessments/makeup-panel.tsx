"use client";

import Link from "next/link";
import { useActionState } from "react";
import { RotateCcw } from "lucide-react";

import {
  prepareMakeup,
  type MakeupState,
} from "@/app/(app)/modules/[id]/assessments/makeup-action";
import { PendingButton } from "@/components/ui/pending-button";

export interface MakeupPanelProps {
  moduleId: string;
  assessmentId: string;
  /** Absent·es excusé·es de l'évaluation. */
  excused: string[];
  /** Rattrapage déjà préparé, avec les étudiant·es inscrit·es. */
  makeup: { id: string; title: string; enrolled: number } | null;
}

/** Rattrapage d'un sujet individuel, pour les seul·es absent·es excusé·es (US-96). */
export function MakeupPanel({ moduleId, assessmentId, excused, makeup }: MakeupPanelProps) {
  const [state, action, pending] = useActionState(
    prepareMakeup.bind(null, moduleId, assessmentId),
    {} as MakeupState,
  );
  const waiting = makeup ? excused.length - makeup.enrolled : excused.length;
  if (!makeup && excused.length === 0) return null;

  return (
    <section aria-labelledby="makeup" className="space-y-3 rounded-lg border p-4">
      <h2 id="makeup" className="text-lg font-medium">
        Rattrapage
      </h2>
      <p className="text-sm">
        Absent·es excusé·es ({excused.length}) : {excused.join(", ") || "—"}.
      </p>
      {makeup ? (
        <p className="text-sm">
          Rattrapage préparé :{" "}
          <Link
            href={`/modules/${moduleId}/assessments/${makeup.id}`}
            className="underline underline-offset-2"
          >
            {makeup.title}
          </Link>{" "}
          ({makeup.enrolled} étudiant·e{makeup.enrolled > 1 ? "s" : ""} inscrit·e
          {makeup.enrolled > 1 ? "s" : ""}). Sa note remplace l’absence excusée dans la moyenne.
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">
          Copie le sujet en brouillon « à construire » : tu le modifies pour en faire un sujet
          similaire. Même grille, même coefficient, même barème. La note du rattrapage remplace
          l’absence excusée ; elle ne compte pas comme une note de plus pour YNOV.
        </p>
      )}
      {!makeup || waiting > 0 ? (
        <form action={action}>
          <PendingButton
            type="submit"
            variant="secondary"
            size="sm"
            pending={pending}
            pendingLabel="Préparation…"
          >
            <RotateCcw aria-hidden />
            {makeup
              ? `Ajouter ${waiting} absent·e${waiting > 1 ? "s" : ""} excusé·e${waiting > 1 ? "s" : ""} au rattrapage`
              : "Préparer le rattrapage"}
          </PendingButton>
        </form>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
    </section>
  );
}
