import { describe, expect, it } from "vitest";

import {
  checksKey,
  checksSummary,
  cleanExpectations,
  isFreeComment,
  joinDescription,
  parseChecks,
  serializeChecks,
  splitDescription,
  toggleCheck,
} from "./expectations";

describe("attendus dans la description", () => {
  it("aller-retour texte + attendus", () => {
    const d = joinDescription("Qualité de l’oral.", ["Clarté", "Rythme"]);
    expect(d).toBe("Qualité de l’oral.\n\n### Attendus\n- Clarté\n- Rythme");
    expect(splitDescription(d)).toEqual({
      text: "Qualité de l’oral.",
      items: ["Clarté", "Rythme"],
    });
  });
  it("sans texte, sans attendus", () => {
    expect(joinDescription("", ["A"])).toBe("### Attendus\n- A");
    expect(joinDescription("Texte", [])).toBe("Texte");
    expect(splitDescription("Juste un texte")).toEqual({ text: "Juste un texte", items: [] });
    expect(splitDescription(null)).toEqual({ text: "", items: [] });
  });
  it("nettoie : puces, doublons, vides, longueur, plafond de 30", () => {
    expect(cleanExpectations("- a\n\n• a\n2) b\n   c  ")).toEqual(["a", "b", "c"]);
    expect(cleanExpectations(["x".repeat(500)])[0]).toHaveLength(200);
    expect(cleanExpectations(Array.from({ length: 50 }, (_, i) => `i${i}`))).toHaveLength(30);
  });
  it("titre insensible à la casse, texte après le bloc ignoré hors puces", () => {
    expect(splitDescription("Intro\n### attendus\n- un\nnote perdue\n- deux").items).toEqual([
      "un",
      "deux",
    ]);
  });
});

describe("cases cochées", () => {
  it("lecture sûre", () => {
    expect(parseChecks("0,2,2,9", 3)).toEqual([0, 2]);
    expect(parseChecks("a,b", 3)).toEqual([]);
    expect(parseChecks("", 3)).toEqual([]);
    expect(parseChecks(null, 3)).toEqual([]);
  });
  it("écriture et bascule", () => {
    expect(serializeChecks([2, 0, 2])).toBe("0,2");
    expect(toggleCheck([0], 2)).toEqual([0, 2]);
    expect(toggleCheck([0, 2], 0)).toEqual([2]);
  });
  it("clé, résumé, commentaires libres", () => {
    expect(checksKey("abc")).toBe("checks:abc");
    expect(checksSummary(1, 5)).toBe("1 attendu sur 5");
    expect(checksSummary(3, 5)).toBe("3 attendus sur 5");
    expect(isFreeComment("abc")).toBe(true);
    expect(isFreeComment("checks:abc")).toBe(false);
    expect(isFreeComment("axis:abc")).toBe(false);
  });
});

describe("plainDescription", () => {
  it("liste lisible dans les documents remis", async () => {
    const { plainDescription } = await import("./expectations");
    expect(plainDescription("Texte\n\n### Attendus\n- A\n- B")).toBe("Texte\nAttendus :\n• A\n• B");
    expect(plainDescription("### Attendus\n- A")).toBe("Attendus :\n• A");
    expect(plainDescription("Simple")).toBe("Simple");
    expect(plainDescription(null)).toBe("");
  });
});
