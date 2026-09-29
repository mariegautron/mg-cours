import { describe, expect, it } from "vitest";

import {
  canPresent,
  evaluatedCriteria,
  isPrepStatus,
  PREP_STATUS_LABELS,
  subjectSections,
} from "./subject";

describe("état de préparation", () => {
  it("libellés français", () => {
    expect(PREP_STATUS_LABELS).toEqual({
      to_build: "À construire",
      ready: "Prête",
      provided: "Fournie",
    });
  });

  it("seul « à construire » bloque la projection", () => {
    expect(canPresent("to_build")).toBe(false);
    expect(canPresent("ready")).toBe(true);
    expect(canPresent("provided")).toBe(true);
  });

  it("reconnaît un statut valide", () => {
    expect(isPrepStatus("ready")).toBe(true);
    expect(isPrepStatus("done")).toBe(false);
    expect(isPrepStatus(null)).toBe(false);
  });
});

describe("subjectSections", () => {
  it("ne garde que les sections renseignées, dans l'ordre de lecture", () => {
    const sections = subjectSections({
      objective: "Corriger un extrait HTML",
      subject: "  ",
      deliverable_md: "Votre version corrigée",
      evaluated_md: null,
    });
    expect(sections.map((s) => s.key)).toEqual(["objective", "deliverable"]);
    expect(sections[0].markdown).toBe(false);
  });

  it("aucune section pour un sujet vide", () => {
    expect(
      subjectSections({ objective: null, subject: null, deliverable_md: null, evaluated_md: null }),
    ).toEqual([]);
  });
});

describe("evaluatedCriteria", () => {
  it("ordonne par position et marque les bonus", () => {
    expect(
      evaluatedCriteria([
        { label: "B", weight: 2, position: 1 },
        { label: "A", weight: 4, position: 0 },
        { label: "Bonus", weight: 1, is_bonus: true, position: 2 },
      ]),
    ).toEqual([
      { label: "A", points: 4, bonus: false },
      { label: "B", points: 2, bonus: false },
      { label: "Bonus", points: 1, bonus: true },
    ]);
  });
});
