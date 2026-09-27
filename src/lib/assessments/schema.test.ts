import { describe, expect, it } from "vitest";

import { assessmentSchema, parseCriteriaLines, readAssessmentForm } from "./schema";

describe("parseCriteriaLines", () => {
  it("parse un critère par ligne au format « Libellé | points »", () => {
    const criteria = parseCriteriaLines("Présentation | 4\nDémonstration | 6\n");
    expect(criteria).toEqual([
      { label: "Présentation", weight: 4, lineNumber: 1 },
      { label: "Démonstration", weight: 6, lineNumber: 2 },
    ]);
  });

  it("ignore les lignes vides", () => {
    const criteria = parseCriteriaLines("Présentation | 4\n\n\nDémonstration | 6\n");
    expect(criteria).toHaveLength(2);
  });

  it("signale un libellé manquant", () => {
    const criteria = parseCriteriaLines("| 4\n");
    expect(criteria[0].error).toBe("libellé manquant");
  });

  it("signale des points manquants ou invalides", () => {
    expect(parseCriteriaLines("Présentation\n")[0].error).toBe("points invalides");
    expect(parseCriteriaLines("Présentation | abc\n")[0].error).toBe("points invalides");
    expect(parseCriteriaLines("Présentation | 0\n")[0].error).toBe("points invalides");
    expect(parseCriteriaLines("Présentation | -2\n")[0].error).toBe("points invalides");
  });
});

describe("readAssessmentForm", () => {
  const G1 = "11111111-1111-4111-8111-111111111111";
  const G2 = "22222222-2222-4222-8222-222222222222";
  const form = (groupIds: string[]) => {
    const fd = new FormData();
    fd.set("title", "TP noté");
    for (const id of groupIds) fd.append("studentGroupIds", id);
    return fd;
  };

  it("accepte plusieurs groupes et retire les doublons", () => {
    const parsed = readAssessmentForm(form([G1, G2, G1]));
    expect(parsed.success && parsed.data.studentGroupIds).toEqual([G1, G2]);
  });

  it("exige au moins un groupe", () => {
    const parsed = readAssessmentForm(form([]));
    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.studentGroupIds).toEqual([
      "Choisissez au moins un groupe.",
    ]);
  });

  it("barème : vide → null, décimal accepté (virgule ou point), zéro refusé", () => {
    const withMax = (v: string) => {
      const fd = form([G1]);
      fd.set("maxScore", v);
      return readAssessmentForm(fd);
    };
    const empty = withMax("");
    expect(empty.success && empty.data.maxScore).toBeNull();
    const comma = withMax("24,5");
    expect(comma.success && comma.data.maxScore).toBe(24.5);
    const zero = withMax("0");
    expect(zero.success).toBe(false);
    expect(zero.error?.flatten().fieldErrors.maxScore).toEqual([
      "Le barème doit être supérieur à 0.",
    ]);
  });
});

describe("assessmentSchema — sujet", () => {
  const base = { title: "Oral", studentGroupIds: ["00000000-0000-4000-8000-000000000000"] };

  it("accepte un sujet Markdown jusqu'à 20 000 caractères", () => {
    expect(assessmentSchema.safeParse({ ...base, subject: "a".repeat(20000) }).success).toBe(true);
  });

  it("refuse un sujet au-delà de 20 000 caractères", () => {
    const parsed = assessmentSchema.safeParse({ ...base, subject: "a".repeat(20001) });
    expect(parsed.success).toBe(false);
  });
});
