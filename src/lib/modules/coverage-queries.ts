import "server-only";

import { getExpectationLinks } from "@/lib/modules/expectation-links";
import {
  coverageFromLinks,
  coverageState,
  matchResources,
  summarizeCoverage,
  type CoverageSummary,
} from "@/lib/modules/matching";
import { getExpectationCourses, listCandidateResources } from "@/lib/modules/matching-queries";
import type { LinkedResource, ModuleExpectation } from "@/lib/modules/queries";
import { createClient } from "@/lib/supabase/server";

/**
 * Couverture des attendus du module (même calcul que l'écran de rapprochement) : par liens
 * explicites attendu ↔ ressource. Sans la table des liens (base pas encore mise à jour), l'ancien
 * calcul par correspondance de mots avec les ressources retenues reste en vigueur.
 */
export async function getModuleCoverage(
  moduleId: string,
  expectations: ModuleExpectation[],
  retained: Pick<LinkedResource, "id">[],
): Promise<CoverageSummary> {
  if (expectations.length === 0) return summarizeCoverage([]);
  const [links, coursesByExpectation] = await Promise.all([
    getExpectationLinks(moduleId),
    getExpectationCourses(moduleId),
  ]);

  if (links.available) {
    const linkedIds = [...new Set([...links.byExpectation.values()].flatMap((s) => [...s]))];
    const status = new Map<string, "ready" | "progress">();
    if (linkedIds.length) {
      const supabase = await createClient();
      const { data } = await supabase.from("resource").select("id, status").in("id", linkedIds);
      for (const r of data ?? []) status.set(r.id, r.status);
    }
    return summarizeCoverage(
      expectations.map((e) =>
        coverageFromLinks({
          courseIds: coursesByExpectation.get(e.id) ?? [],
          linkedResources: [...(links.byExpectation.get(e.id) ?? [])].flatMap((id) => {
            const s = status.get(id);
            return s ? [{ status: s }] : [];
          }),
        }),
      ),
    );
  }

  const candidates = await listCandidateResources();
  const retainedIds = new Set(retained.map((r) => r.id));
  return summarizeCoverage(
    expectations.map((e) =>
      coverageState({
        courseIds: coursesByExpectation.get(e.id) ?? [],
        retainedMatches: matchResources(e.label, candidates, candidates.length, { excerpts: false })
          .filter((m) => retainedIds.has(m.resource.id))
          .map((m) => ({ status: m.resource.status })),
      }),
    ),
  );
}
