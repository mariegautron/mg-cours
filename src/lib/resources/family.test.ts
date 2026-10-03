import { describe, expect, it } from "vitest";

import { RESOURCE_KINDS } from "./kind";
import { familyCounts, familyOf, FAMILY_LINKS, inFamily, isResourceFamily } from "./family";

describe("familyOf", () => {
  it("classe chaque type de ressource", () => {
    expect(familyOf("course")).toBe("courses");
    expect(familyOf("workshop")).toBe("workshops");
    expect(familyOf("project")).toBe("assessments");
    expect(familyOf("answer_key")).toBe("assessments");
    expect(familyOf("template")).toBe("assessments");
    expect(familyOf("question_bank")).toBe("quizzes");
    expect(familyOf("reference")).toBeNull();
    expect(familyOf(null)).toBeNull();
  });
  it("tous les types connus sont traités", () => {
    for (const k of RESOURCE_KINDS) expect(() => familyOf(k)).not.toThrow();
  });
});

describe("familles", () => {
  const items = [
    { kind: "course" as const },
    { kind: "course" as const },
    { kind: "answer_key" as const },
    { kind: "reference" as const },
    { kind: null },
  ];
  it("compte par famille, hors famille ignoré", () => {
    expect(familyCounts(items)).toEqual({ courses: 2, workshops: 0, assessments: 1, quizzes: 0 });
  });
  it("filtre par famille ; sans famille, tout", () => {
    expect(inFamily(items, "courses")).toHaveLength(2);
    expect(inFamily(items, undefined)).toHaveLength(5);
  });
  it("valide la famille de l'URL et rattache grilles, phrases, questions", () => {
    expect(isResourceFamily("quizzes")).toBe(true);
    expect(isResourceFamily("nope")).toBe(false);
    expect(FAMILY_LINKS.assessments.map((l) => l.href)).toEqual([
      "/assessments/grids",
      "/assessments/comments",
    ]);
    expect(FAMILY_LINKS.quizzes[0].href).toBe("/questions");
  });
});
