import type { Metadata } from "next";
import Link from "next/link";

import { EspaceError, EspaceShell } from "@/components/modules/espace-shell";
import { FriseStudent } from "@/components/modules/frise-view";
import { dueLabel, nextEvaluationIndex } from "@/lib/modules/espace";
import { callModuleFrise } from "@/lib/modules/frise-public";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Le module en un coup d’œil",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const card =
  "bg-card focus-visible:ring-ring block min-h-11 rounded-2xl border p-4 focus-visible:ring-2 focus-visible:outline-none";

export default async function SharedFrisePage({ params }: PageProps<"/module/[token]">) {
  const { token } = await params;
  const res = await callModuleFrise(token);
  if (res.status !== "ok") return <EspaceError status={res.status} />;

  const { frise, espace } = res;
  const today = new Date().toISOString().slice(0, 10);
  const next = nextEvaluationIndex(espace, frise, today);
  const base = `/module/${token}`;
  const dateOf = new Map(frise.sessions.map((s) => [s.number, s.date]));

  return (
    <EspaceShell token={token} espace={espace} current="accueil" publishedAt={res.publishedAt}>
      <FriseStudent
        frise={frise}
        today={today}
        nextHref={next !== null ? `${base}/evaluation/${next + 1}` : undefined}
      />
      {espace && (espace.brief || espace.evaluations.length || espace.courses.length) ? (
        <section aria-labelledby="acces" className="mt-8 space-y-3">
          <h2 id="acces" className="font-heading text-xl font-bold">
            Tout ce qu’il te faut
          </h2>
          <ul className="space-y-3">
            {espace.brief ? (
              <li>
                <Link href={`${base}/projet`} className={card}>
                  <strong>Le projet</strong>
                  <span className="text-muted-foreground block text-sm">{espace.brief.title}</span>
                </Link>
              </li>
            ) : null}
            {espace.evaluations.map((e, i) => (
              <li key={i}>
                <Link href={`${base}/evaluation/${i + 1}`} className={card}>
                  <strong>{e.title}</strong>
                  <span className="text-muted-foreground block text-sm">
                    Sujet{e.grid ? " et grille" : ""} · à rendre :{" "}
                    {dueLabel(
                      e.date ?? (e.sessionNumber ? (dateOf.get(e.sessionNumber) ?? null) : null),
                      e.time,
                    )}
                  </span>
                </Link>
              </li>
            ))}
            {espace.courses.length ? (
              <li>
                <Link href={`${base}/cours`} className={card}>
                  <strong>Les cours</strong>
                  <span className="text-muted-foreground block text-sm">
                    Les fiches de chaque séance
                  </span>
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </EspaceShell>
  );
}
