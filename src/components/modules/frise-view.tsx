import { Mascot } from "@/components/mascot";
import {
  bandLayout,
  nextMilestone,
  PERIOD_LABELS,
  sessionEvents,
  sessionHeading,
  shortDate,
  summaryLine,
  type BandKind,
  type Frise,
} from "@/lib/modules/frise";
import { cn } from "@/lib/utils";

const BAND_STYLE: Record<BandKind, string> = {
  launch: "border-primary bg-primary/15",
  group: "border-sun bg-sun/15",
  individual: "border-sky bg-sky/15",
};

const DOT_STYLE: Record<BandKind, string> = {
  launch: "bg-primary",
  group: "bg-sun",
  individual: "bg-sky",
};

const PILL_STYLE: Record<BandKind, string> = {
  launch: "border-primary text-primary",
  group: "border-sun text-sun",
  individual: "border-sky text-sky",
};

/**
 * Frise du module projetée (maquette « ProjeteModule ») : titre, séances numérotées sur une ligne,
 * lancement et notes en bandes sur les séances qu'elles occupent, légende en mots (la couleur n'est
 * jamais seule). Pas de donnée d'étudiant·e : titres, dates et types de note seulement.
 */
export function FriseProjected({
  frise,
  large = false,
  embedded = false,
}: {
  frise: Frise;
  large?: boolean;
  /** Dans une page qui a déjà son titre : le nom du module devient un titre de niveau 2. */
  embedded?: boolean;
}) {
  const Title = embedded ? "h2" : "h1";
  const n = frise.sessions.length;
  const bands = bandLayout(frise);
  const columns = { gridTemplateColumns: `repeat(${Math.max(n, 1)}, minmax(0, 1fr))` };

  return (
    <div className={cn("space-y-6", large ? "text-xl" : "text-base")}>
      <header className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-muted-foreground mb-1.5 text-sm font-semibold tracking-widest uppercase">
            Ce module en un coup d’œil
          </p>
          <Title
            className={cn(
              "font-heading leading-tight font-bold text-balance",
              large ? "text-6xl" : "text-4xl",
            )}
          >
            {frise.moduleName}
          </Title>
          <p className={cn("text-muted-foreground mt-2", large ? "text-2xl" : "text-lg")}>
            {summaryLine(frise)}
          </p>
        </div>
        <Mascot mood="happy" className={cn("flex-none", large ? "size-28" : "size-20")} />
      </header>

      {n === 0 ? (
        <p className="text-muted-foreground">Aucune séance planifiée pour l’instant.</p>
      ) : (
        <>
          <div className="relative pt-2">
            <div
              aria-hidden
              className="bg-foreground/20 absolute top-9 right-[6%] left-[6%] h-1 rounded-full"
            />
            <ol aria-label="Séances" className="relative grid gap-2" style={columns}>
              {frise.sessions.map((s) => (
                <li key={s.number} className="text-center">
                  <span
                    className={cn(
                      "bg-card border-primary font-heading mx-auto flex items-center justify-center rounded-full border-[3px] font-extrabold",
                      large ? "size-14 text-2xl" : "size-11 text-lg",
                    )}
                  >
                    <span className="sr-only">Séance </span>
                    {s.number}
                  </span>
                  <p className={cn("mt-2 font-bold", large ? "text-xl" : "text-base")}>
                    {shortDate(s.date)}
                  </p>
                  {s.period ? (
                    <p className="text-muted-foreground text-sm">{PERIOD_LABELS[s.period]}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>

          {bands.length ? (
            <ul aria-label="Lancement et notes" className="grid gap-x-3 gap-y-3" style={columns}>
              {bands.map((b) => (
                <li
                  key={b.key}
                  className={cn("rounded-2xl border-2 px-4 py-3", BAND_STYLE[b.kind])}
                  style={{ gridColumn: `${b.start} / ${b.end + 1}`, gridRow: b.row + 1 }}
                >
                  <p className="font-heading leading-snug font-extrabold">{b.label}</p>
                  <p className="text-muted-foreground text-sm">{b.sub}</p>
                </li>
              ))}
            </ul>
          ) : null}

          <p
            className={cn(
              "text-muted-foreground flex flex-wrap gap-x-7 gap-y-1",
              large && "text-xl",
            )}
          >
            <span>
              <span aria-hidden className="text-sun">
                ■
              </span>{" "}
              Note de groupe
            </span>
            <span>
              <span aria-hidden className="text-sky">
                ■
              </span>{" "}
              Note individuelle
            </span>
            {frise.launchSession ? (
              <span>
                <span aria-hidden className="text-primary">
                  ■
                </span>{" "}
                Lancement
              </span>
            ) : null}
          </p>
        </>
      )}
    </div>
  );
}

/**
 * Le module côté étudiant·e (maquette « EtuModule »), pensé pour le téléphone : la frise en
 * liste verticale, ce qui se passe à chaque séance, puis les rendus à venir. Une page publique :
 * aucune donnée d'étudiant·e, aucune note.
 */
export function FriseStudent({
  frise,
  today,
  embedded = false,
  nextHref,
}: {
  frise: Frise;
  today: string;
  embedded?: boolean;
  /** Page du prochain rendu (espace étudiant·e) ; à défaut, l'ancre de la carte. */
  nextHref?: string;
}) {
  const Title = embedded ? "h3" : "h1";
  const events = sessionEvents(frise);
  const next = nextMilestone(frise, today);
  const dateOf = new Map(frise.sessions.map((s) => [s.number, s.date]));

  return (
    <div className="space-y-6">
      <header>
        <Title className="font-heading text-2xl leading-tight font-bold">{frise.moduleName}</Title>
        <p className="text-muted-foreground mt-1 text-sm">{summaryLine(frise)}</p>
      </header>

      {frise.sessions.length === 0 ? (
        <p className="text-muted-foreground">Les séances ne sont pas encore planifiées.</p>
      ) : (
        <ol aria-label="Les séances" className="space-y-0">
          {frise.sessions.map((s, i) => {
            const list = events.get(s.number) ?? [];
            const kind: BandKind = list[0]?.kind ?? "launch";
            return (
              <li key={s.number} className="flex gap-3.5">
                <div aria-hidden className="flex flex-none flex-col items-center">
                  <span
                    className={cn(
                      "mt-1.5 size-3.5 rounded-full",
                      list.length ? DOT_STYLE[kind] : "bg-primary/60",
                    )}
                  />
                  {i < frise.sessions.length - 1 ? (
                    <span className="bg-foreground/15 w-0.5 flex-1" />
                  ) : null}
                </div>
                <div className="pb-5">
                  <p className="text-muted-foreground text-[0.8rem] font-semibold">
                    {shortDate(s.date)}
                    {s.period ? ` · ${PERIOD_LABELS[s.period]}` : ""}
                  </p>
                  <p className="text-base font-bold">{sessionHeading(s)}</p>
                  {s.slidesUrl ? (
                    <p className="mt-1">
                      <a
                        href={s.slidesUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-2"
                      >
                        Slides de la séance {s.number}
                        <span className="sr-only"> (nouvel onglet)</span>
                      </a>
                    </p>
                  ) : null}
                  {list.length ? (
                    <p className="mt-1.5 flex flex-wrap gap-1.5">
                      {list.map((e) => (
                        <span
                          key={e.label}
                          className={cn(
                            "inline-flex min-h-7 items-center rounded-full border px-2.5 text-[0.8rem] font-bold",
                            PILL_STYLE[e.kind],
                          )}
                        >
                          {e.label}
                        </span>
                      ))}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {frise.milestones.length ? (
        <section
          aria-labelledby={embedded ? undefined : "rendus"}
          aria-label={embedded ? "Les rendus et les notes" : undefined}
          className="space-y-3"
        >
          <h2 id={embedded ? undefined : "rendus"} className="font-heading text-xl font-bold">
            Les rendus et les notes
          </h2>
          <ul className="space-y-3">
            {frise.milestones.map((m, i) => (
              <li
                key={i}
                id={next === m ? "prochain" : undefined}
                className={cn(
                  "scroll-mt-4 rounded-2xl border-2 p-4",
                  BAND_STYLE[m.kind],
                  next === m && "ring-primary ring-2",
                )}
              >
                <p className="font-bold">
                  {m.title}
                  {next === m ? (
                    <span className="bg-primary text-primary-foreground ml-2 rounded-full px-2 py-0.5 text-[0.7rem]">
                      Prochain rendu
                    </span>
                  ) : null}
                </p>
                <p className="text-muted-foreground text-sm">
                  {m.sessionNumber
                    ? `Séance ${m.sessionNumber}${dateOf.get(m.sessionNumber) ? ` · ${shortDate(dateOf.get(m.sessionNumber) ?? null)}` : ""} · `
                    : ""}
                  {m.kind === "group" ? "note de groupe" : "note individuelle"}
                </p>
                {m.deliverable ? (
                  <p className="mt-1.5 text-sm">
                    <strong>À rendre :</strong> {m.deliverable}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {next ? (
        <div
          className={cn(
            "bg-background/95 py-2.5 backdrop-blur",
            embedded
              ? "border-t"
              : "sticky bottom-0 -mx-4 border-t px-4 sm:mx-0 sm:rounded-2xl sm:border",
          )}
        >
          <a
            href={nextHref ?? "#prochain"}
            className="bg-primary text-primary-foreground focus-visible:ring-ring flex min-h-[3.25rem] w-full items-center justify-center rounded-xl text-base font-semibold focus-visible:ring-2 focus-visible:outline-none"
          >
            Voir mon prochain rendu
          </a>
        </div>
      ) : null}
    </div>
  );
}
