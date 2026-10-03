import { describe, expect, it } from "vitest";

import { requiredNotes, noteProgress } from "@/lib/ynov/notation";

import {
  jalonsCount,
  notesMessage,
  requirementLabel,
  totalCoefficient,
  validateSchoolGrade,
} from "./module-notes";

describe("notes exigées d'après les heures", () => {
  it("21 h = 3 notes ; message selon ce qui manque", () => {
    expect(requiredNotes(21).total).toBe(3);
    const none = noteProgress(21, { group: 0, individual: 0 });
    expect(notesMessage(none)).toMatch(/^Il te manque 3 notes \(/);
    const oneLeft = noteProgress(21, {
      group: requiredNotes(21).group,
      individual: requiredNotes(21).individual - 1,
    });
    expect(notesMessage(oneLeft)).toBe("Il te manque 1 note (1 individuelle).");
  });
  it("complet", () => {
    const r = requiredNotes(21);
    const done = noteProgress(21, { group: r.group, individual: r.individual });
    expect(notesMessage(done)).toContain("C’est complet");
  });
  it("heures absentes : invite à les renseigner", () => {
    expect(notesMessage(noteProgress(0, { group: 0, individual: 0 }))).toContain(
      "Renseigne les heures",
    );
  });
  it("libellé, hors palier signalé", () => {
    expect(requirementLabel(21, noteProgress(21, { group: 0, individual: 0 }))).toBe(
      "21 h : 3 notes exigées",
    );
    expect(requirementLabel(18, noteProgress(18, { group: 0, individual: 0 }))).toContain(
      "hors palier",
    );
  });
});

describe("jalons et coefficients", () => {
  it("jalons = évaluations de projet de rôle jalon", () => {
    expect(
      jalonsCount([
        { project_id: "p", project_role: "milestone" },
        { project_id: "p", project_role: "milestone" },
        { project_id: "p", project_role: "oral" },
        { project_id: null, project_role: null },
      ]),
    ).toBe(2);
  });
  it("somme des coefficients, arrondie", () => {
    expect(totalCoefficient([{ coefficient: 1 }, { coefficient: 0.1 }, { coefficient: 0.2 }])).toBe(
      1.3,
    );
    expect(totalCoefficient([])).toBe(0);
  });
});

describe("validateSchoolGrade", () => {
  it("titre obligatoire, coefficient entre 0 et 10 (virgule acceptée)", () => {
    expect(validateSchoolGrade({ title: " Contrôle continu ", coefficient: "1,5" })).toEqual({
      ok: true,
      title: "Contrôle continu",
      coefficient: 1.5,
    });
    expect(validateSchoolGrade({ title: " ", coefficient: "1" }).ok).toBe(false);
    expect(validateSchoolGrade({ title: "x", coefficient: "0" }).ok).toBe(false);
    expect(validateSchoolGrade({ title: "x", coefficient: "abc" }).ok).toBe(false);
    expect(validateSchoolGrade({ title: "x", coefficient: "11" }).ok).toBe(false);
  });
});
