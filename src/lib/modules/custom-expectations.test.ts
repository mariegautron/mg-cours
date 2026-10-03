import { describe, expect, it } from "vitest";

import {
  cleanCustomLabel,
  isCustomExpectation,
  nextExpectationPosition,
  originSummary,
  splitExpectations,
} from "./custom-expectations";

describe("attendus ajoutés à la main", () => {
  it("sépare école / ajouté ; colonne absente = école", () => {
    const items = [{ origin: "school" }, { origin: "custom" }, {}, { origin: null }];
    const { school, custom } = splitExpectations(items);
    expect(school).toHaveLength(3);
    expect(custom).toHaveLength(1);
    expect(isCustomExpectation({ origin: "custom" })).toBe(true);
    expect(isCustomExpectation({})).toBe(false);
  });
  it("libellé : puce retirée, espaces normalisés, bornes", () => {
    expect(cleanCustomLabel("  - Savoir  animer\nun atelier ")).toEqual({
      ok: true,
      label: "Savoir animer un atelier",
    });
    expect(cleanCustomLabel("ab").ok).toBe(false);
    expect(cleanCustomLabel("x".repeat(1001)).ok).toBe(false);
    expect(cleanCustomLabel("x".repeat(1000)).ok).toBe(true);
  });
  it("position suivante", () => {
    expect(nextExpectationPosition([])).toBe(0);
    expect(nextExpectationPosition([0, 4, 2])).toBe(5);
  });
  it("résumé d'origine", () => {
    expect(originSummary([{ origin: "school" }, { origin: "school" }])).toBe("2 de l’école");
    expect(originSummary([{ origin: "school" }, { origin: "custom" }, { origin: "custom" }])).toBe(
      "1 de l’école, 2 ajoutés par toi",
    );
  });
});
