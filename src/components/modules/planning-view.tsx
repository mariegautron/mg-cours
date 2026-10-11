import Link from "next/link";

import type { PlanningDay } from "@/lib/modules/planning";

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });

const hm = (t: string | null) => (t ? t.slice(0, 5) : "—");

/** Planning du module : un bloc par jour, un tableau minuté par séance. */
export function PlanningView({ days, moduleId }: { days: PlanningDay[]; moduleId: string }) {
  if (!days.length) {
    return <p className="text-muted-foreground">Ce module n’a pas encore de séance.</p>;
  }
  const card = "bg-card rounded-3xl border p-5 shadow-sm";
  return (
    <div className="space-y-5">
      <nav aria-label="Les jours du module" className="flex flex-wrap gap-2">
        {days.map((day, i) => (
          <a
            key={day.date ?? `sans-date-${i}`}
            href={`#jour-${i}`}
            className="bg-card hover:bg-accent rounded-full border px-4 py-1.5 text-sm font-semibold"
          >
            {day.date ? shortDate(day.date) : "Sans date"} ·{" "}
            {day.sessions.map((s) => `S${s.position}`).join(" ")}
          </a>
        ))}
      </nav>
      {days.map((day, i) => (
        <section
          key={day.date ?? `sans-date-${i}`}
          id={`jour-${i}`}
          aria-labelledby={`jour-t-${i}`}
          className={card}
        >
          <h2 id={`jour-t-${i}`} className="font-heading mb-4 text-xl font-bold capitalize">
            {day.date ? longDate(day.date) : "Date à fixer"}
          </h2>
          <div className="grid gap-5 lg:grid-cols-2">
            {day.sessions.map((s) => (
              <article key={s.id} className="bg-background rounded-2xl border p-4">
                <h3 className="font-semibold">
                  <Link
                    href={`/modules/${moduleId}/courses/${s.id}`}
                    className="underline underline-offset-2"
                  >
                    Séance {s.position} · {hm(s.startTime)}–{hm(s.endTime)}
                  </Link>
                </h3>
                <p className="text-muted-foreground mb-3 text-sm">{s.title}</p>
                {s.rows.length ? (
                  <table className="w-full text-sm">
                    <caption className="sr-only">
                      Déroulé de la séance {s.position} : horaire, activité, durée
                    </caption>
                    <thead className="sr-only">
                      <tr>
                        <th scope="col">Horaire</th>
                        <th scope="col">Activité</th>
                        <th scope="col">Durée</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.rows.map((r) => (
                        <tr
                          key={`${r.start}-${r.title}`}
                          className={r.kind === "pause" ? "text-muted-foreground italic" : ""}
                        >
                          <td className="py-1 pr-3 align-top font-mono whitespace-nowrap">
                            {r.start}–{r.end}
                          </td>
                          <td className="py-1 pr-3">{r.title}</td>
                          <td className="py-1 text-right whitespace-nowrap">{r.minutes} min</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Aucun horaire renseigné pour les ressources de cette séance.
                  </p>
                )}
                {s.assessments.length ? (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {s.assessments.map((a) => (
                      <li
                        key={a.title}
                        className="rounded-full border px-3 py-0.5 text-xs font-semibold"
                      >
                        {a.title}
                        {a.oralStartTime ? ` · oral à ${hm(a.oralStartTime)}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
