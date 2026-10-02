import { ArrowDownUp, Check, CircleHelp, Clock, FastForward } from "lucide-react";

import type { ClosingStatus, ProjectionRecap } from "@/lib/notebook/projection";

const ICON: Record<ClosingStatus, { Icon: typeof Check; tone: string }> = {
  none: { Icon: CircleHelp, tone: "bg-muted text-muted-foreground" },
  on_time: { Icon: Check, tone: "bg-mint/20 text-mint" },
  late: { Icon: Clock, tone: "bg-sun/20 text-sun" },
  early: { Icon: FastForward, tone: "bg-sky/20 text-sky" },
  reordered: { Icon: ArrowDownUp, tone: "bg-violet/20 text-violet" },
};

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });

/**
 * Ce que l'appli a retenu de la projection (US-136) : statut en mots + icône + une phrase, puis
 * ce qui a été projeté (avec l'heure) et ce qui ne l'a pas été. Jamais la couleur seule.
 */
export function ProjectionStatus({
  recap,
  headingLevel = 3,
  showList = true,
}: {
  recap: ProjectionRecap;
  headingLevel?: 2 | 3;
  showList?: boolean;
}) {
  const { Icon, tone } = ICON[recap.status];
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div
      role="group"
      className="space-y-3 rounded-lg border p-4"
      aria-labelledby="projection-status"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${tone}`}
        >
          <Icon className="size-4" />
        </span>
        <div>
          <Heading id="projection-status" className="font-medium">
            Relevé de la projection : {recap.label}
          </Heading>
          <p className="text-muted-foreground text-sm">{recap.sentence}</p>
        </div>
      </div>
      {showList && (recap.projected.length > 0 || recap.missing.length > 0) ? (
        <ul className="divide-y text-sm">
          {recap.projected.map((p) => (
            <li key={p.key} className="flex flex-wrap justify-between gap-2 py-1.5">
              <span>
                <span className="sr-only">Traité : </span>
                {p.title}
              </span>
              <span className="text-muted-foreground">Projeté à {time(p.at)}</span>
            </li>
          ))}
          {recap.missing.map((m) => (
            <li key={m.key} className="flex flex-wrap justify-between gap-2 py-1.5">
              <span>
                <span className="sr-only">Pas traité : </span>
                {m.title}
              </span>
              <span className="text-muted-foreground">Pas projeté</span>
            </li>
          ))}
        </ul>
      ) : null}
      {recap.orderChanged ? (
        <p className="text-muted-foreground text-xs">
          L’ordre de projection diffère de l’ordre prévu. L’ordre prévu du déroulé reste inchangé.
        </p>
      ) : null}
    </div>
  );
}
