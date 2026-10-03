import { describe, expect, it } from "vitest";

import { absences, formatGrade, gradesByModule, type GradeLine } from "./record";

const line = (over: Partial<GradeLine>): GradeLine => ({
  moduleId: "m1",
  moduleName: "Agile",
  assessmentId: "a1",
  assessmentTitle: "Oral",
  value: 12,
  maxScore: 20,
  attendance: "present",
  isGroupGrade: false,
  ...over,
});

describe("gradesByModule", () => {
  it("regroupe par module, trie modules et évaluations", () => {
    const res = gradesByModule([
      line({ moduleId: "m2", moduleName: "Zèbre", assessmentTitle: "B" }),
      line({ assessmentTitle: "Rendu" }),
      line({ assessmentId: "a2", assessmentTitle: "Oral" }),
    ]);
    expect(res.map((m) => m.moduleName)).toEqual(["Agile", "Zèbre"]);
    expect(res[0].lines.map((l) => l.assessmentTitle)).toEqual(["Oral", "Rendu"]);
  });
  it("vide", () => {
    expect(gradesByModule([])).toEqual([]);
  });
});

describe("absences / formatGrade", () => {
  it("ne garde que les absences", () => {
    const res = absences([
      line({}),
      line({ attendance: "absent_excused" }),
      line({ attendance: "absent_unexcused" }),
    ]);
    expect(res).toHaveLength(2);
  });
  it("formate la note", () => {
    expect(formatGrade(14, 20)).toBe("14 / 20");
    expect(formatGrade(12.5, 20)).toBe("12,5 / 20");
    expect(formatGrade(null, 20)).toBe("pas de note");
  });
});
