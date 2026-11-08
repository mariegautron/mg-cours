"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";

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
  items = [],
  plannedTitles = [],
}: {
  action: Action;
  number: number;
  /** Relevé de la projection (US-136), rendu côté serveur. */
  recap: ReactNode;
  aside: ReactNode;
  /** Retour à la vue privée de la séance. */
  backHref: string;
  /** Éléments prévus mais pas projetés (ou déjà reportés à une clôture précédente). */
  items?: { key: string; title: string; initial: "carry" | "skip" }[];
  /** Titres du déroulé prévu : une ligne qui en reprend un vient d'une ancienne proposition, recalculée ici. */
  plannedTitles?: string[];
  course: {
    completion: CourseCompletion | null;
    not_covered: string | null;
    next_time: string | null;
    retro_note: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(action, {});
  // Chaque élément est « à reporter » (il passe dans la séance suivante) ou « pas fait
  // volontairement » (ni reporté ni rappelé).
  const [skipped, setSkipped] = useState<Set<string>>(
    new Set(items.filter((i) => i.initial === "skip").map((i) => i.key)),
  );
  const titles = new Set([...items.map((i) => i.title), ...plannedTitles]);
  const [extra, setExtra] = useState(
    (course.not_covered ?? "")
      .split("\n")
      .filter((l) => l.trim() && !titles.has(l.trim()))
      .join("\n"),
  );
  const carryKeys = items.filter((i) => !skipped.has(i.key)).map((i) => i.key);
  const skipKeys = items.filter((i) => skipped.has(i.key)).map((i) => i.key);
  // Une fiche reportée quitte le déroulé ; les autres éléments (sujet, QCM…) restent un rappel écrit.
  const reminders = items
    .filter((i) => !skipped.has(i.key) && !i.key.startsWith("resource:"))
    .map((i) => i.title);
  const notCoveredValue = [...reminders, ...(extra.trim() ? [extra.trim()] : [])].join("\n");

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
              {items.length ? (
                <fieldset className="space-y-2 rounded-lg border p-3">
                  <legend className="px-1 text-sm font-medium">
                    Prévu mais pas projeté : à reporter ou pas fait volontairement ?
                  </legend>
                  <ul className="space-y-2">
                    {items.map((item) => {
                      const isSkipped = skipped.has(item.key);
                      return (
                        <li
                          key={item.key}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                          <span className="min-w-0 flex-1 font-medium">{item.title}</span>
                          <span
                            role="group"
                            aria-label={item.title}
                            className="grid grid-cols-2 overflow-hidden rounded-lg border"
                          >
                            {(
                              [
                                [false, "À reporter"],
                                [true, "Pas fait volontairement"],
                              ] as const
                            ).map(([value, label]) => (
                              <button
                                key={label}
                                type="button"
                                aria-pressed={isSkipped === value}
                                onClick={() =>
                                  setSkipped((prev) => {
                                    const next = new Set(prev);
                                    if (value) next.add(item.key);
                                    else next.delete(item.key);
                                    return next;
                                  })
                                }
                                className={`focus-visible:ring-ring min-h-11 px-3 text-[0.8rem] font-semibold focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset ${
                                  isSkipped === value
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-accent"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="text-muted-foreground text-xs">
                    Une fiche « à reporter » passe dans le déroulé de la séance suivante et quitte
                    celui-ci. « Pas fait volontairement » : elle reste ici, sans être reportée ni
                    rappelée.
                  </p>
                </fieldset>
              ) : null}
              <Textarea
                id="notCovered"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                aria-describedby="notCovered-hint"
                placeholder={items.length ? "Autre point à reporter (facultatif)" : undefined}
              />
              <input type="hidden" name="notCovered" value={notCoveredValue} />
              <input type="hidden" name="carryKeys" value={JSON.stringify(carryKeys)} />
              <input type="hidden" name="skipKeys" value={JSON.stringify(skipKeys)} />
              <input
                type="hidden"
                name="itemTitles"
                value={JSON.stringify(Object.fromEntries(items.map((i) => [i.key, i.title])))}
              />
              <p id="notCovered-hint" className="text-muted-foreground text-xs">
                Rien de noté n’est perdu : les points à reporter sont rappelés au début de la séance
                suivante.
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
