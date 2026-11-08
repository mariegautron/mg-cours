import "server-only";

import { listAssessmentExpectations } from "@/lib/assessments/expectation-queries";
import { listModuleAssessments } from "@/lib/assessments/queries";
import {
  buildExpectationCoverage,
  type ExpectationCoverageRow,
  type ExpectationCoverageSummary,
} from "@/lib/modules/expectation-coverage";
import { getExpectationCourses } from "@/lib/modules/matching-queries";
import { getModuleCourses, getModuleExpectations } from "@/lib/modules/queries";

/** Couverture des attendus du module par les cours et par les évaluations. */
export async function getExpectationCoverageView(moduleId: string): Promise<{
  rows: ExpectationCoverageRow[];
  summary: ExpectationCoverageSummary;
  evaluationsAvailable: boolean;
}> {
  const [expectations, courses, assessments, coursesByExpectation] = await Promise.all([
    getModuleExpectations(moduleId),
    getModuleCourses(moduleId),
    listModuleAssessments(moduleId),
    getExpectationCourses(moduleId),
  ]);
  const regular = assessments.filter((a) => !a.makeup_of_id);
  const evaluated = await listAssessmentExpectations(regular.map((a) => a.id));
  const assessmentsByExpectation = new Map<string, string[]>();
  for (const [assessmentId, expectationIds] of evaluated.byAssessment) {
    for (const eid of expectationIds) {
      assessmentsByExpectation.set(eid, [
        ...(assessmentsByExpectation.get(eid) ?? []),
        assessmentId,
      ]);
    }
  }
  const built = buildExpectationCoverage({
    expectations: expectations.map((e) => ({ id: e.id, label: e.label })),
    courses: courses.map((c, i) => ({ id: c.id, title: `Séance ${i + 1} — ${c.title}` })),
    assessments: regular.map((a) => ({ id: a.id, title: a.title })),
    coursesByExpectation,
    assessmentsByExpectation,
  });
  return { ...built, evaluationsAvailable: evaluated.available };
}
