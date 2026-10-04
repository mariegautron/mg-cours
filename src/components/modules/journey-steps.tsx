import Link from "next/link";
import { Check } from "lucide-react";

import { Pill } from "@/components/dashboard/pill";
import { isLater, stepSubtitle } from "@/lib/modules/hero";
import type { ModuleSteps } from "@/lib/ynov/module-steps";
import { cn } from "@/lib/utils";

/**
 * « Où j'en suis » (maquette OuJenSuis) : les dix étapes en liste numérotée. Fait = coche verte,
 * étape courante = pastille violette + « Prochaine étape », étapes d'après la préparation estompées.
 * Chaque ligne est un lien vers son écran (étape faite, courante ou à venir), même pour un module
 * terminé ou rangé.
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
          // Chaque étape mène à son écran : refaire une étape faite, continuer, ou la regarder d'avance.
          const verb = s.state === "done" ? "revoir" : isCurrent ? "continuer" : "ouvrir";
          const hint = s.state === "done" ? "Revoir" : isCurrent ? "Continuer" : "Ouvrir";
          return (
            <li key={s.key} aria-current={isCurrent ? "step" : undefined}>
              <Link
                href={s.action.href}
                aria-label={`${s.title} : ${verb}, ${s.summary}`}
                className={cn(
                  "group hover:bg-accent/60 focus-visible:ring-ring flex min-h-11 flex-wrap items-center gap-x-3.5 gap-y-1 rounded-xl px-2 py-1.5 focus-visible:ring-2 focus-visible:outline-none",
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
                <span
                  aria-hidden
                  className={cn("min-w-0 flex-1 font-semibold", later && "text-muted-foreground")}
                >
                  {s.title}
                </span>
                <span aria-hidden className="text-muted-foreground text-sm">
                  {stepSubtitle(s)}
                </span>
                {isCurrent ? (
                  <span aria-hidden>
                    <Pill tone="warn">Prochaine étape</Pill>
                  </span>
                ) : null}
                <span
                  aria-hidden
                  className="text-primary text-sm font-semibold underline underline-offset-2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                  {hint}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
