import { describe, expect, it } from "vitest";

import { groupsBySchoolYear, schoolYearLabel } from "./groups";

const g = (id: string, name: string, module: { name: string; year: number } | null) => ({
  id,
  name,
  module: module ? { id: `m-${id}`, ...module } : null,
});

describe("schoolYearLabel", () => {
  it("formate l'année scolaire à partir de l'année de rentrée", () => {
    expect(schoolYearLabel(2025)).toBe("2025-26");
    expect(schoolYearLabel(2099)).toBe("2099-00");
  });
});

describe("groupsBySchoolYear", () => {
  it("regroupe par année (plus récente d'abord), trie par module puis groupe, libellé complet", () => {
    const years = groupsBySchoolYear([
      g("a", "Groupe 10", { name: "Scrum", year: 2025 }),
      g("b", "Groupe 2 – ESN Altisys", { name: "Gestion d'un projet IT", year: 2025 }),
      g("c", "TP 1", { name: "Accessibilité", year: 2026 }),
      g("d", "Orphelin", null),
      g("e", "Groupe 2", { name: "Scrum", year: 2025 }),
    ]);
    expect(years.map((y) => y.label)).toEqual(["2026-27", "2025-26", "Sans module"]);
    expect(years[1].groups.map((x) => x.display)).toEqual([
      "Groupe 2 – ESN Altisys · Gestion d'un projet IT · 2025-26",
      "Groupe 2 · Scrum · 2025-26",
      "Groupe 10 · Scrum · 2025-26",
    ]);
    expect(years[2].groups[0].display).toBe("Orphelin");
  });

  it("aucun groupe : liste vide", () => {
    expect(groupsBySchoolYear([])).toEqual([]);
  });
});
