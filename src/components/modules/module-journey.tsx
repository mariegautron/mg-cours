import Link from "next/link";
import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATE_LABELS, type ModuleSteps, type StepState } from "@/lib/ynov/module-steps";

const STATE_VARIANT: Record<StepState, "default" | "secondary" | "outline"> = {
  done: "secondary",
  in_progress: "default",
  waiting: "outline",
  todo: "outline",
};

/**
 * « Où j'en suis » (E18) : parcours du module en 10 étapes. L'état est toujours écrit en texte,
 * l'étape courante porte `aria-current="step"` et un bouton d'action.
 */
export function ModuleJourney({ journey }: { journey: ModuleSteps }) {
  if (!journey.steps.length) return null;
  const { current } = journey;
  const done = journey.steps.filter((s) => s.state === "done").length;

  return (
    <section aria-labelledby="journey" className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="journey" className="scroll-mt-16 text-lg font-medium">
          Où j’en suis
        </h2>
        <p className="text-muted-foreground text-sm">
          {done}/{journey.steps.length} étapes faites
        </p>
      </div>

      {current ? (
        <div className="halo bg-card flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
          <div>
            <p className="text-primary text-sm font-medium">Prochaine étape</p>
            <p className="font-heading text-lg font-semibold">
              {current.number}. {current.title}
            </p>
            <p className="text-muted-foreground text-sm">{current.summary}</p>
          </div>
          <Button asChild size="lg">
            <Link href={current.action.href}>{current.action.label}</Link>
          </Button>
        </div>
      ) : (
        <p role="status" className="rounded-lg border p-4 text-sm">
          Toutes les étapes sont faites : ce module est bouclé.
        </p>
      )}

      <ol className="divide-y">
        {journey.steps.map((s) => (
          <li
            key={s.key}
            aria-current={s === current ? "step" : undefined}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-sm"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="bg-muted flex size-6 shrink-0 items-center justify-center rounded-full text-xs"
              >
                {s.state === "done" ? <Check className="size-3.5" /> : s.number}
              </span>
              <div>
                <p className={s === current ? "font-semibold" : "font-medium"}>
                  <span className="sr-only">Étape {s.number} : </span>
                  {s.title}
                </p>
                <p className="text-muted-foreground">{s.summary}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={STATE_VARIANT[s.state]}>{STATE_LABELS[s.state]}</Badge>
              {s !== current && s.state !== "done" ? (
                <Link href={s.action.href} className="text-sm underline underline-offset-2">
                  {s.action.label}
                  <span className="sr-only"> (étape {s.number})</span>
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
