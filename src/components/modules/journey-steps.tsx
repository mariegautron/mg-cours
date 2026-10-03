import Link from "next/link";
import { Check } from "lucide-react";

import { Pill } from "@/components/dashboard/pill";
import { isLater, stepSubtitle } from "@/lib/modules/hero";
import type { ModuleSteps } from "@/lib/ynov/module-steps";
import { cn } from "@/lib/utils";

/**
 * « Où j'en suis » (maquette OuJenSuis) : les dix étapes en liste numérotée. Fait = coche verte,
 * étape courante = pastille violette + « Prochaine étape », étapes d'après la préparation estompées.
 * L'état est écrit en mots (sous-titre) ; `aria-current="step"` marque l'étape courante.
 */
export function JourneySteps({ journey }: { journey: ModuleSteps }) {
  if (!journey.steps.length) return null;
  const current = journey.current;
  return (
    <section aria-labelledby="etapes" className="bg-card rounded-3xl border px-4 py-4 shadow-sm">
      <h2 id="etapes" className="font-heading mx-2 mb-1.5 text-xl font-bold">
        Où j’en suis
      </h2>
      <ol>
        {journey.steps.map((s) => {
          const isCurrent = s === current;
          const later = isLater(s, current?.key ?? null);
          return (
            <li
              key={s.key}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex min-h-11 flex-wrap items-center gap-x-3.5 gap-y-1 rounded-xl px-2 py-1.5",
                isCurrent && "bg-primary/10",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-[0.8rem] font-bold",
                  s.state === "done" && "bg-mint text-background border-transparent",
                  isCurrent && "bg-primary text-primary-foreground border-transparent",
                  !isCurrent && s.state !== "done" && "text-muted-foreground",
                )}
              >
                {s.state === "done" ? <Check className="size-3.5" strokeWidth={3.5} /> : s.number}
              </span>
              {s.state === "done" || later ? (
                <span
                  className={cn("min-w-0 flex-1 font-semibold", later && "text-muted-foreground")}
                >
                  <span className="sr-only">Étape {s.number} : </span>
                  {s.title}
                </span>
              ) : (
                <Link
                  href={s.action.href}
                  className="focus-visible:ring-ring min-w-0 flex-1 rounded-sm font-semibold underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                >
                  <span className="sr-only">Étape {s.number} : </span>
                  {s.title}
                </Link>
              )}
              <span className="text-muted-foreground text-sm">{stepSubtitle(s)}</span>
              {isCurrent ? <Pill tone="warn">Prochaine étape</Pill> : null}
              {s.state === "done" ? <span className="sr-only">Fait</span> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
