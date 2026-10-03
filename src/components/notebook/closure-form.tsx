"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";

import { ActionError } from "@/components/action-error";
import type { NotebookState } from "@/app/(app)/modules/[id]/courses/[courseId]/notebook/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pill } from "@/components/dashboard/pill";
import { COMPLETION_OPTIONS, type CourseCompletion } from "@/lib/notebook/notebook";
import { keepFormValues } from "@/lib/use-kept-form";

type Action = (state: NotebookState, formData: FormData) => Promise<NotebookState>;

const card = "bg-card space-y-3 rounded-xl border p-5";

/**
 * Clôture de la séance (maquette « Cloture ») : quatre questions à gauche (statut, relevé de ce
 * qui s'est passé, consigne pour la prochaine fois, retour privé), l'aside à droite (notes du
 * jour, suite, jalon) et la barre d'action collée en bas.
 */
export function ClosureForm({
  action,
  course,
  number,
  recap,
  aside,
  backHref,
  suggestedNotCovered = "",
}: {
  action: Action;
  number: number;
  /** Relevé de la projection (US-136), rendu côté serveur. */
  recap: ReactNode;
  aside: ReactNode;
  /** Retour à la vue privée de la séance. */
  backHref: string;
  /** Proposition tirée du journal de projection, utilisée si rien n'a encore été noté (US-136). */
  suggestedNotCovered?: string;
  course: {
    completion: CourseCompletion | null;
    not_covered: string | null;
    next_time: string | null;
    retro_note: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form onSubmit={keepFormValues(formAction)}>
      <div className="flex flex-col gap-6 pb-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-[1_1_0] space-y-4 lg:flex-[3_1_0]">
          <fieldset className={card}>
            <legend className="sr-only">La séance a été…</legend>
            <h2 className="text-lg font-semibold" aria-hidden>
              1 · La séance a-t-elle eu lieu comme prévu ?
            </h2>
            <div className="flex flex-wrap gap-2">
              {COMPLETION_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className="has-[:checked]:bg-primary/15 has-[:checked]:border-primary has-[:focus-visible]:ring-ring flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm font-medium has-[:focus-visible]:ring-2"
                >
                  <input
                    type="radio"
                    name="completion"
                    value={o.value}
                    defaultChecked={course.completion === o.value}
                    className="accent-primary size-4"
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>

          <section aria-labelledby="q2" className={card}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="q2" className="text-lg font-semibold">
                2 · Qu’est-ce qui s’est vraiment passé ?
              </h2>
              <span className="text-muted-foreground text-sm">Relevé pendant le cours</span>
            </div>
            <p className="text-muted-foreground text-sm">
              L’appli a gardé ce que tu as projeté. Corrige seulement ce qui ne colle pas.
            </p>
            {recap}
            <div className="space-y-1">
              <Label htmlFor="notCovered">Points non traités, à reporter</Label>
              <Textarea
                id="notCovered"
                name="notCovered"
                defaultValue={course.not_covered || suggestedNotCovered}
                aria-describedby="notCovered-hint"
              />
              <p id="notCovered-hint" className="text-muted-foreground text-xs">
                {suggestedNotCovered && !course.not_covered
                  ? "Proposé d’après ce qui n’a pas été projeté : modifie ou efface ce qui ne colle pas. "
                  : ""}
                Rien de noté n’est perdu : ces points sont rappelés au début de la séance suivante.
              </p>
            </div>
          </section>

          <section aria-labelledby="q3" className={card}>
            <h2 id="q3" className="text-lg font-semibold">
              3 · Que demandes-tu pour la prochaine fois ?
            </h2>
            <p className="text-muted-foreground text-sm">
              Écrit pour les étudiant·es, au vouvoiement. Projeté en ouverture de la séance
              suivante.
            </p>
            <Label htmlFor="nextTime" className="sr-only">
              À faire pour la prochaine fois
            </Label>
            <Textarea id="nextTime" name="nextTime" defaultValue={course.next_time ?? ""} />
          </section>

          <section aria-labelledby="q4" className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="q4" className="text-lg font-semibold">
                4 · Et pour toi, que retiens-tu ?
              </h2>
              <Pill tone="warn">Pour toi seule</Pill>
            </div>
            <Label htmlFor="retroNote" className="sr-only">
              Retour d’expérience (privé)
            </Label>
            <Textarea
              id="retroNote"
              name="retroNote"
              defaultValue={course.retro_note ?? ""}
              placeholder="Ce qui a marché, ce que tu changerais…"
            />
          </section>
        </div>

        <div className="min-w-0 flex-[1_1_0] space-y-4 lg:flex-[2_1_0]">{aside}</div>
      </div>

      <div className="bg-background/95 sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <Button asChild variant="ghost" size="touch">
          <Link href={backHref}>← Retour à ma vue privée</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className="text-muted-foreground text-sm">
            {state.message ?? "Tu pourras modifier après."}
          </p>
          <PendingButton
            type="submit"
            size="touch-lg"
            pending={pending}
            pendingLabel="Enregistrement…"
          >
            Clôturer la séance {number}
          </PendingButton>
        </div>
      </div>
      {state.error ? <ActionError error={state.error} /> : null}
    </form>
  );
}
