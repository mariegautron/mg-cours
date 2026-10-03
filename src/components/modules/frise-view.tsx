import {
  KIND_LABELS,
  PERIOD_LABELS,
  shortDate,
  summaryLine,
  type Frise,
  type MilestoneKind,
} from "@/lib/modules/frise";
import { cn } from "@/lib/utils";

const KIND_STYLE: Record<MilestoneKind, string> = {
  group: "border-amber-500 bg-amber-500/10",
  individual: "border-sky-500 bg-sky-500/10",
};

/** Frise du module : séances numérotées, jalons de notes, légende en mots (la couleur n'est jamais seule). */
export function FriseView({ frise, large = false }: { frise: Frise; large?: boolean }) {
  return (
    <div className={cn("space-y-6", large && "text-lg")}>
      <header>
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          Ce module en un coup d’œil
        </p>
        <h1 className={cn("font-semibold", large ? "text-4xl" : "text-2xl")}>{frise.moduleName}</h1>
        <p className="text-muted-foreground">{summaryLine(frise)}</p>
      </header>

      <ol aria-label="Séances" className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
        {frise.sessions.map((s) => (
          <li key={s.number} className="rounded-lg border p-3 text-center">
            <span className="bg-primary text-primary-foreground mx-auto flex size-10 items-center justify-center rounded-full text-lg font-semibold">
              <span className="sr-only">Séance </span>
              {s.number}
            </span>
            <p className="mt-2 font-medium">{shortDate(s.date)}</p>
            {s.period ? (
              <p className="text-muted-foreground text-sm">{PERIOD_LABELS[s.period]}</p>
            ) : null}
            <p className="text-muted-foreground mt-1 text-xs">{s.title}</p>
          </li>
        ))}
      </ol>

      {frise.milestones.length ? (
        <section aria-labelledby="notes">
          <h2 id="notes" className="mb-2 font-medium">
            Les notes
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {frise.milestones.map((m, i) => (
              <li key={i} className={cn("rounded-lg border-2 p-3", KIND_STYLE[m.kind])}>
                <p className="font-semibold">{m.title}</p>
                <p className="text-muted-foreground text-sm">
                  {m.sessionNumber ? `Séance ${m.sessionNumber} · ` : ""}
                  {KIND_LABELS[m.kind]}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
