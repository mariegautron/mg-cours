import { describe, expect, it } from "vitest";

import {
  makeupOverview,
  makeupSummary,
  type OverviewAssessment,
  type OverviewGrade,
} from "./makeup-overview";

const indiv = (id: string): OverviewAssessment => ({
  id,
  title: id,
  is_group_grade: false,
  makeup_of_id: null,
});
const g = (
  assessment_id: string,
  student_id: string,
  attendance = "present",
  value: number | null = null,
): OverviewGrade => ({
  assessment_id,
  student_id,
  attendance,
  value,
});
const names = new Map([
  ["s1", "Zoé Martin"],
  ["s2", "Ana Durand"],
  ["s3", "Léo Bernard"],
]);

describe("makeupOverview", () => {
  it("sans rattrapage préparé : sujet à préparer, par ordre alphabétique", () => {
    const o = makeupOverview({
      assessments: [indiv("a")],
      grades: [
        g("a", "s1", "absent_excused"),
        g("a", "s2", "absent_excused"),
        g("a", "s3", "present", 12),
      ],
      enrolled: new Map(),
      studentNames: names,
    });
    expect(o).toHaveLength(1);
    expect(o[0].makeup).toBeNull();
    expect(o[0].rows.map((r) => [r.student.name, r.step])).toEqual([
      ["Ana Durand", "to_prepare"],
      ["Zoé Martin", "to_prepare"],
    ]);
  });

  it("rattrapage préparé : à inscrire, note à saisir, note remplacée", () => {
    const makeup: OverviewAssessment = {
      id: "m",
      title: "Rattrapage — a",
      is_group_grade: false,
      makeup_of_id: "a",
    };
    const o = makeupOverview({
      assessments: [indiv("a"), makeup],
      grades: [
        g("a", "s1", "absent_excused"),
        g("a", "s2", "absent_excused"),
        g("a", "s3", "absent_excused"),
        g("m", "s2", "present", 14),
      ],
      enrolled: new Map([["m", ["s2", "s3"]]]),
      studentNames: names,
    });
    expect(o).toHaveLength(1);
    expect(o[0].makeup).toEqual({ id: "m", title: "Rattrapage — a" });
    const step = (n: string) => o[0].rows.find((r) => r.student.name === n)?.step;
    expect(step("Ana Durand")).toBe("done");
    expect(step("Léo Bernard")).toBe("to_grade");
    expect(step("Zoé Martin")).toBe("to_enroll");
  });

  it("jamais pour une note de groupe, ni pour un rattrapage lui-même", () => {
    const group: OverviewAssessment = {
      id: "gr",
      title: "gr",
      is_group_grade: true,
      makeup_of_id: null,
    };
    const makeup: OverviewAssessment = {
      id: "m",
      title: "m",
      is_group_grade: false,
      makeup_of_id: "a",
    };
    const o = makeupOverview({
      assessments: [group, makeup],
      grades: [g("gr", "s1", "absent_excused"), g("m", "s2", "absent_excused")],
      enrolled: new Map(),
      studentNames: names,
    });
    expect(o).toEqual([]);
  });

  it("doublons d'absence ignorés, nom inconnu remplacé", () => {
    const o = makeupOverview({
      assessments: [indiv("a")],
      grades: [g("a", "x", "absent_excused"), g("a", "x", "absent_excused")],
      enrolled: new Map(),
      studentNames: new Map(),
    });
    expect(o[0].rows).toHaveLength(1);
    expect(o[0].rows[0].student.name).toBe("Étudiant·e");
  });

  it("résumé", () => {
    expect(makeupSummary([])).toBe("Personne à rattraper.");
    const makeup: OverviewAssessment = {
      id: "m",
      title: "m",
      is_group_grade: false,
      makeup_of_id: "a",
    };
    const o = makeupOverview({
      assessments: [indiv("a"), makeup],
      grades: [
        g("a", "s1", "absent_excused"),
        g("a", "s2", "absent_excused"),
        g("m", "s1", "present", 10),
      ],
      enrolled: new Map([["m", ["s1", "s2"]]]),
      studentNames: names,
    });
    expect(makeupSummary(o)).toBe("1 à rattraper, 1 note remplacée.");
  });
});
