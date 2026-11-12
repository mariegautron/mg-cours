import Link from "next/link";

import { plural } from "@/lib/plural";
import { Pill } from "@/components/dashboard/pill";
import { LinkExpectationCourse } from "@/components/modules/link-expectation-course";
import { COVERAGE_STATE_LABELS } from "@/lib/modules/expectation-coverage";
import { getExpectationCoverageView } from "@/lib/modules/expectation-coverage-queries";
import { getModuleCourses } from "@/lib/modules/queries";

/**
 * Couverture des attendus : pour chaque attendu, les séances et évaluations qui le traitent, et de
 * quoi le relier à une séance. Affichée dans la page Attendus (doublon D27 : l'ancienne page
 * « Couverture » y redirige).
 */
export async function ExpectationCoverage({ moduleId }: { moduleId: string }) {
  const id = moduleId;
  const [{ rows, summary }, courses] = await Promise.all([
    getExpectationCoverageView(id),
    getModuleCourses(id),
  ]);
  const tone = { both: "ok", course: "ok", assessment: "ok", none: "warn" } as const;

  return (
    <div className="space-y-3">
      <p role="status" className="text-sm font-medium">
        {plural(summary.total, "attendu")} : {summary.byCourse} par un cours, {summary.byAssessment}{" "}
        par une évaluation, {summary.byNone} par aucun.
      </p>
      {summary.byNone > 0 ? (
        <p role="alert" className="border-status-todo bg-muted rounded-xl border p-3 text-sm">
          {summary.byNone} attendu{summary.byNone > 1 ? "s" : ""} sans cours ni évaluation : relie-
          {summary.byNone > 1 ? "les" : "le"} à une séance (fiche de la séance, « Attendus traités
          ») ou à une évaluation (page de l’évaluation, « Attendus évalués »).
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
                    {r.courses.length ? (
                      r.courses.map((c) => c.title).join(", ")
                    ) : (
                      <LinkExpectationCourse
                        moduleId={id}
                        expectationId={r.id}
                        label={r.label}
                        courses={courses.map((c, i) => ({
                          id: c.id,
                          title: `Séance ${i + 1} — ${c.title}`,
                        }))}
                      />
                    )}
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
