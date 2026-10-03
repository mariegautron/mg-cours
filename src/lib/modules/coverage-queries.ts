import "server-only";

import {
  coverageState,
  matchResources,
  summarizeCoverage,
  type CoverageSummary,
} from "@/lib/modules/matching";
import { getExpectationCourses, listCandidateResources } from "@/lib/modules/matching-queries";
import type { LinkedResource, ModuleExpectation } from "@/lib/modules/queries";

/** Couverture des attendus du module (même calcul que l'écran de rapprochement). */
export async function getModuleCoverage(
  moduleId: string,
  expectations: ModuleExpectation[],
  retained: Pick<LinkedResource, "id">[],
): Promise<CoverageSummary> {
  if (expectations.length === 0) return summarizeCoverage([]);
  const [candidates, coursesByExpectation] = await Promise.all([
    listCandidateResources(),
    getExpectationCourses(moduleId),
  ]);
  const retainedIds = new Set(retained.map((r) => r.id));
  return summarizeCoverage(
    expectations.map((e) =>
      coverageState({
        courseIds: coursesByExpectation.get(e.id) ?? [],
        retainedMatches: matchResources(e.label, candidates, candidates.length)
          .filter((m) => retainedIds.has(m.resource.id))
          .map((m) => ({ status: m.resource.status })),
      }),
    ),
  );
}
