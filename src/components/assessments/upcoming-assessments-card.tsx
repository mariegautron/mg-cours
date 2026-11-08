import Link from "next/link";

import type { UpcomingAssessment } from "@/lib/assessments/day-j-queries";

/** « Évaluations à venir » : les 14 prochains jours, triées par date, avec ce qui manque. */
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
    <section aria-labelledby="upc-eval" className="bg-card rounded-3xl border p-5 shadow-sm">
      <H id="upc-eval" className="font-heading mb-2 text-lg font-bold">
        Évaluations à venir
      </H>
      <ul className="space-y-3">
        {items.map((a) => (
          <li key={a.id} className="text-sm">
            <Link
              href={`/modules/${a.moduleId}/assessments`}
              className="font-semibold underline-offset-2 hover:underline"
            >
              {a.title}
            </Link>
            <span className="text-muted-foreground">
              {" "}
              ·{" "}
              {new Date(a.date).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
              {showModule ? ` · ${a.moduleName}` : ""}
            </span>
            {a.missing.length === 0 ? (
              <p className="text-muted-foreground">Tout est prêt.</p>
            ) : (
              <ul className="mt-0.5 space-y-0.5">
                {a.missing.map((m) => (
                  <li key={m.key}>
                    <Link href={m.href} className="underline underline-offset-2">
                      <span aria-hidden>! </span>
                      {m.label} : {m.todo}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
