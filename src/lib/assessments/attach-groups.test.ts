import { describe, expect, it } from "vitest";

import { ungroupedAssessmentIds } from "./attach-groups";

describe("ungroupedAssessmentIds", () => {
  it("garde les évaluations sans groupe", () => {
    expect(ungroupedAssessmentIds(["a", "b", "c"], ["b", "b"])).toEqual(["a", "c"]);
  });
  it("rien à rattacher quand toutes ont un groupe", () => {
    expect(ungroupedAssessmentIds(["a"], ["a"])).toEqual([]);
  });
});
