import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EspaceError, EspaceShell, readEspace } from "@/components/modules/espace-shell";
import { Markdown } from "@/components/markdown";
import { dueLabel } from "@/lib/modules/espace";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Évaluation",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function EspaceEvaluationPage({
  params,
}: PageProps<"/module/[token]/evaluation/[n]">) {
  const { token, n } = await params;
  const res = await readEspace(token);
  if (res.status !== "ok") return <EspaceError status={res.status} />;
  const { espace, frise } = res;
  const index = Number(n) - 1;
  const e = espace?.evaluations[index];
  if (!espace || !e) notFound();

  const sessionDate = e.sessionNumber
    ? (frise.sessions.find((s) => s.number === e.sessionNumber)?.date ?? null)
    : null;
  const facts = [
    ["À rendre", dueLabel(e.date ?? sessionDate, e.time)],
    e.sessionNumber ? ["Séance", `Séance ${e.sessionNumber}`] : null,
    e.durationMinutes ? ["Durée", `${e.durationMinutes} min`] : null,
    e.whereToSubmit ? ["Où rendre", e.whereToSubmit] : null,
    ["Note", e.groupGrade ? "Note de groupe" : "Note individuelle"],
  ].filter((f): f is string[] => f !== null);

  return (
    <EspaceShell token={token} espace={espace} current="evaluation" publishedAt={res.publishedAt}>
      {espace.evaluations.length > 1 ? (
        <nav aria-label="Les évaluations" className="mb-4">
          <ul className="flex flex-wrap gap-2">
            {espace.evaluations.map((x, i) => (
              <li key={i}>
                <Link
                  href={`/module/${token}/evaluation/${i + 1}`}
                  aria-current={i === index ? "page" : undefined}
                  className={`focus-visible:ring-ring inline-flex min-h-11 items-center rounded-lg border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none ${
                    i === index ? "bg-secondary font-semibold" : "hover:bg-accent"
                  }`}
                >
                  {x.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <h1 className="font-heading text-2xl font-bold">{e.title}</h1>
      {e.type ? <p className="text-muted-foreground mt-1 text-sm">{e.type}</p> : null}
      <dl className="bg-card mt-4 grid gap-3 rounded-2xl border p-4 sm:grid-cols-2">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground text-xs font-bold tracking-widest uppercase">
              {label}
            </dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      {e.sections.map((s) => (
        <section key={s.heading} aria-labelledby={`s-${s.heading}`} className="mt-6">
          <h2 id={`s-${s.heading}`} className="font-heading mb-2 text-xl font-bold">
            {s.heading}
          </h2>
          <Markdown source={s.text} headingLevel={3} />
        </section>
      ))}

      {e.grid ? (
        <section aria-labelledby="grille" className="mt-8">
          <h2 id="grille" className="font-heading mb-1 text-xl font-bold">
            La grille d’évaluation
          </h2>
          <p className="text-muted-foreground mb-3 text-sm">
            Sur {e.grid.maxScore} points. Chaque critère a un poids et des niveaux.
          </p>
          {e.grid.axes.map((axis, ai) => (
            <div key={ai} className="mb-5">
              {axis.label ? (
                <h3 className="font-heading text-lg font-bold">
                  {axis.label}{" "}
                  <span className="text-muted-foreground text-sm font-semibold">
                    · {axis.points} point{axis.points > 1 ? "s" : ""}
                  </span>
                </h3>
              ) : null}
              <ul className="mt-2 space-y-3">
                {axis.criteria.map((c, ci) => (
                  <li key={ci} className="bg-card rounded-2xl border p-4">
                    <p className="font-semibold">
                      {c.label}
                      <span className="text-muted-foreground ml-2 text-sm font-normal">
                        {c.weight} point{c.weight > 1 ? "s" : ""}
                        {c.bonus ? " · bonus" : ""}
                      </span>
                    </p>
                    {c.levels.length ? (
                      <ul className="mt-2 space-y-1 text-sm">
                        {c.levels.map((l, li) => (
                          <li key={li}>
                            <strong>
                              {l.points} pt{l.points > 1 ? "s" : ""}
                            </strong>{" "}
                            : {l.description}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
    </EspaceShell>
  );
}
