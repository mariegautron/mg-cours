import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  buildForExpectation,
  retainForModule,
  setExpectationCourses,
} from "@/app/(app)/modules/[id]/matching/actions";
import { KindBadge, StatusBadge } from "@/components/resources/resource-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  coverageState,
  formatCoverage,
  matchResources,
  summarizeCoverage,
  type CoverageState,
} from "@/lib/modules/matching";
import { getExpectationCourses, listCandidateResources } from "@/lib/modules/matching-queries";
import {
  getModule,
  getModuleCourses,
  getModuleExpectations,
  getRetainedResources,
} from "@/lib/modules/queries";

export const metadata: Metadata = { title: "Rapprochement" };

const STATE_LABELS: Record<CoverageState, string> = {
  covered: "Couvert",
  to_build: "À construire",
  uncovered: "Sans ressource",
};

export default async function MatchingPage({ params }: PageProps<"/modules/[id]/matching">) {
  const { id } = await params;
  const [mod, expectations, courses, retained, candidates, coursesByExpectation] =
    await Promise.all([
      getModule(id),
      getModuleExpectations(id),
      getModuleCourses(id),
      getRetainedResources(id),
      listCandidateResources(),
      getExpectationCourses(id),
    ]);
  if (!mod) notFound();

  const retainedIds = new Set(retained.map((r) => r.id));
  const rows = expectations.map((e) => {
    const matches = matchResources(e.label, candidates);
    const courseIds = coursesByExpectation.get(e.id) ?? [];
    const state = coverageState({
      courseIds,
      retainedMatches: matches
        .filter((m) => retainedIds.has(m.resource.id))
        .map((m) => ({ status: m.resource.status })),
    });
    return { e, matches, courseIds, state };
  });
  const summary = summarizeCoverage(rows.map((r) => r.state));
  const notCovered = rows.filter((r) => r.state !== "covered");

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href={`/modules/${mod.id}`} className="text-sm underline underline-offset-2">
          ← {mod.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Rapprochement attendus et ressources</h1>
        <p className="text-muted-foreground">
          Pour chaque attendu de l’école, les ressources dont les tags, le titre ou le contenu
          partagent ses mots-clés. Retenez-en une, ou notez-la à construire.
        </p>
      </div>

      {expectations.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm">
          Aucun attendu enregistré.{" "}
          <Link href={`/modules/${mod.id}/expectations`} className="underline underline-offset-2">
            Lire les attendus de la fiche
          </Link>{" "}
          pour commencer.
        </p>
      ) : (
        <>
          <section aria-labelledby="balance" className="space-y-2 rounded-lg border p-4">
            <h2 id="balance" className="text-lg font-medium">
              Bilan
            </h2>
            <p role="status" className="text-sm font-medium">
              {formatCoverage(summary)}
            </p>
            {notCovered.length ? (
              <div className="text-sm">
                <p>Non couverts :</p>
                <ul className="list-disc pl-5">
                  {notCovered.map(({ e, state }) => (
                    <li key={e.id}>
                      <a href={`#expectation-${e.id}`} className="underline underline-offset-2">
                        {e.label}
                      </a>{" "}
                      <span className="text-muted-foreground">({STATE_LABELS[state]})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm">Tous les attendus sont couverts.</p>
            )}
          </section>

          <ul className="space-y-4">
            {rows.map(({ e, matches, courseIds, state }) => (
              <li key={e.id} id={`expectation-${e.id}`} className="scroll-mt-16">
                <section
                  aria-labelledby={`title-${e.id}`}
                  className="space-y-3 rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 id={`title-${e.id}`} className="font-medium">
                      {e.label}
                    </h2>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">
                        {e.kind === "objective" ? "Objectif" : "Unité"}
                      </Badge>
                      <Badge variant={state === "covered" ? "secondary" : "outline"}>
                        {STATE_LABELS[state]}
                      </Badge>
                    </div>
                  </div>

                  {matches.length ? (
                    <ul className="divide-y rounded-md border">
                      {matches.map(({ resource, shared }) => {
                        const isRetained = retainedIds.has(resource.id);
                        return (
                          <li
                            key={resource.id}
                            className="flex flex-wrap items-center justify-between gap-2 p-3"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Link
                                  href={`/resources/${resource.id}`}
                                  className="font-medium underline-offset-2 hover:underline"
                                >
                                  {resource.title}
                                </Link>
                                <KindBadge kind={resource.kind} />
                                <StatusBadge status={resource.status} />
                              </div>
                              <p className="text-muted-foreground text-sm">
                                Mots communs : {shared.join(", ")} ·{" "}
                                {resource.moduleNames.length
                                  ? `Sert déjà dans : ${resource.moduleNames.join(", ")}`
                                  : "Pas encore utilisée"}
                              </p>
                            </div>
                            {isRetained ? (
                              <Badge variant="secondary">Retenue</Badge>
                            ) : (
                              <form action={retainForModule.bind(null, mod.id, resource.id)}>
                                <Button
                                  type="submit"
                                  size="sm"
                                  variant="secondary"
                                  aria-label={`Retenir ${resource.title}`}
                                >
                                  Retenir
                                </Button>
                              </form>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Aucune ressource ne partage de mot-clé avec cet attendu.
                    </p>
                  )}

                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <form action={buildForExpectation.bind(null, mod.id, e.id)}>
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        aria-label={`Noter « ${e.label} » à construire`}
                      >
                        À construire
                      </Button>
                    </form>

                    {courses.length ? (
                      <form
                        action={setExpectationCourses.bind(null, mod.id, e.id)}
                        className="space-y-2"
                      >
                        <fieldset className="space-y-1">
                          <legend className="text-sm font-medium">Couvert par la séance</legend>
                          <ul className="flex flex-wrap gap-x-4 gap-y-1">
                            {courses.map((c) => (
                              <li key={c.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`c-${e.id}-${c.id}`}
                                  name="courseIds"
                                  value={c.id}
                                  defaultChecked={courseIds.includes(c.id)}
                                />
                                <Label htmlFor={`c-${e.id}-${c.id}`} className="font-normal">
                                  {c.title}
                                </Label>
                              </li>
                            ))}
                          </ul>
                        </fieldset>
                        <Button
                          type="submit"
                          size="sm"
                          variant="secondary"
                          aria-label={`Enregistrer les séances de « ${e.label} »`}
                        >
                          Enregistrer
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </section>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
