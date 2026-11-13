import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Status } from "@/components/dashboard/pill";
import type { UpcomingAssessment } from "@/lib/assessments/day-j-queries";

/**
 * « Évaluations à venir » : les 14 prochains jours, triées par date. Une ligne cliquable par
 * évaluation (soulignement au survol seulement), ce qui manque en une phrase grise.
 */
export function UpcomingAssessmentsCard({
  items,
  showModule = true,
  headingLevel = 2,
}: {
  items: UpcomingAssessment[];
  showModule?: boolean;
  headingLevel?: 2 | 3;
}) {
  if (items.length === 0) return null;
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <section aria-labelledby="upc-eval" className="bg-card rounded-xl border px-5 py-4">
      <H id="upc-eval" className="mb-1 text-sm font-semibold">
        Évaluations à venir{" "}
        <span className="text-muted-foreground-2 font-normal">{items.length}</span>
      </H>
      <ul>
        {items.map((a) => (
          <li key={a.id} className="border-t first:border-t-0">
            <Link
              href={`/modules/${a.moduleId}/assessments/${a.id}#dayj-top`}
              className="group hover:bg-muted/50 -mx-2 flex min-h-11 items-center gap-3 rounded-lg px-2 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium group-hover:underline">{a.title}</span>
                <span className="text-muted-foreground block text-[0.8125rem]">
                  {new Date(a.date).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                  {showModule ? ` · ${a.moduleName}` : ""}
                  {a.missing.length > 0
                    ? ` · à compléter : ${a.missing.map((m) => m.label.toLowerCase()).join(", ")}`
                    : ""}
                </span>
              </span>
              <Status state={a.missing.length === 0 ? "ready" : "todo"}>
                {a.missing.length === 0 ? "Prête" : `${a.missing.length} à compléter`}
              </Status>
              <ChevronRight aria-hidden className="text-muted-foreground size-4 shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
