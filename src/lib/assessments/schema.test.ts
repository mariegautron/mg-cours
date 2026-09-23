import { describe, expect, it } from "vitest";

import { parseCriteriaLines } from "./schema";

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
