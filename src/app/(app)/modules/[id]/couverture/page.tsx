import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import { COVERAGE_STATE_LABELS } from "@/lib/modules/expectation-coverage";
import { getExpectationCoverageView } from "@/lib/modules/expectation-coverage-queries";
import { getModule } from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Couverture des attendus" };

export default async function CoveragePage({ params }: PageProps<"/modules/[id]/couverture">) {
  const { id } = await params;
  const mod = await getModule(id);
  if (!mod) notFound();
  const { rows, summary } = await getExpectationCoverageView(id);
  const tone = { both: "ok", course: "ok", assessment: "ok", none: "warn" } as const;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Couverture des attendus — {mod.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Chaque attendu de l’école doit être couvert par un cours et/ou une évaluation.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href={`/modules/${id}`}>← Retour au module</Link>
        </Button>
      </div>

      <p role="status" className="text-sm font-medium">
        {summary.total} attendus : {summary.byCourse} par un cours, {summary.byAssessment} par une
        évaluation, {summary.byNone} par aucun.
      </p>
      {summary.byNone > 0 ? (
        <p
          role="alert"
          className="rounded-xl border border-amber-500/60 bg-amber-50 p-3 text-sm dark:bg-amber-950/30"
        >
          {summary.byNone} attendu{summary.byNone > 1 ? "s" : ""} sans cours ni évaluation : relie-
          {summary.byNone > 1 ? "les" : "le"} à une séance (page des attendus) ou à une évaluation
          (page de l’évaluation, « Attendus évalués »).
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-muted-foreground">
          Le module n’a pas encore d’attendus.{" "}
          <Link href={`/modules/${id}/expectations`} className="underline underline-offset-2">
            Ajouter les attendus
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Cours et évaluations qui couvrent chaque attendu</caption>
            <thead>
              <tr className="border-b">
                <th scope="col" className="py-2 pr-3">
                  Attendu
                </th>
                <th scope="col" className="py-2 pr-3">
                  Cours
                </th>
                <th scope="col" className="py-2 pr-3">
                  Évaluations
                </th>
                <th scope="col" className="py-2">
                  État
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b align-top">
                  <th scope="row" className="py-2 pr-3 font-medium">
                    {r.label}
                  </th>
                  <td className="py-2 pr-3">
                    {r.courses.length ? r.courses.map((c) => c.title).join(", ") : "—"}
                  </td>
                  <td className="py-2 pr-3">
                    {r.assessments.length ? (
                      <ul>
                        {r.assessments.map((a) => (
                          <li key={a.id}>
                            <Link
                              href={`/modules/${id}/assessments/${a.id}`}
                              className="underline underline-offset-2"
                            >
                              {a.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2">
                    <Pill tone={tone[r.state]}>{COVERAGE_STATE_LABELS[r.state]}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
