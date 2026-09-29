import { describe, expect, it } from "vitest";

import {
  currentSchoolYear,
  mostLikelyYear,
  parseSchoolYear,
  promotionToShow,
  promotions,
  schoolYearOptions,
} from "./years";

describe("currentSchoolYear", () => {
  it("la rentrée est en août", () => {
    expect(currentSchoolYear(new Date(2026, 8, 28))).toBe(2026);
    expect(currentSchoolYear(new Date(2026, 7, 1))).toBe(2026);
    expect(currentSchoolYear(new Date(2027, 2, 10))).toBe(2026);
    expect(currentSchoolYear(new Date(2027, 6, 31))).toBe(2026);
  });
});

describe("schoolYearOptions", () => {
  it("propose les années proches et celles déjà utilisées, la plus récente d'abord", () => {
    expect(schoolYearOptions([], new Date(2026, 8, 1))).toEqual([2027, 2026, 2025, 2024, 2023]);
    expect(schoolYearOptions([2019, 2025], new Date(2026, 8, 1))).toEqual([
      2027, 2026, 2025, 2024, 2023, 2019,
    ]);
  });
});

describe("parseSchoolYear", () => {
  it.each([
    ["2025-26", 2025],
    ["2025/2026", 2025],
    ["2025", 2025],
    [" 2025 - 26 ", 2025],
  ])("lit « %s »", (input, year) => {
    expect(parseSchoolYear(input)).toBe(year);
  });

  it("refuse une année incohérente ou du texte", () => {
    for (const bad of ["2025-27", "25-26", "abc", "", "1999"]) {
      expect(parseSchoolYear(bad)).toBeNull();
    }
  });
});

describe("mostLikelyYear", () => {
  it("prend l'année la plus fréquente, à égalité la plus récente", () => {
    expect(mostLikelyYear([2024, 2024, 2025], 2026)).toBe(2024);
    expect(mostLikelyYear([2023, 2024], 2026)).toBe(2024);
  });

  it("retombe sur l'année de repli sans groupe", () => {
    expect(mostLikelyYear([], 2026)).toBe(2026);
  });
});

describe("promotions / promotionToShow", () => {
  const years = [
    { year: 2024, scholar_group: "B3 Dev" },
    { year: 2025, scholar_group: " M1 Dev " },
    { year: 2023, scholar_group: null },
  ];

  it("liste les promotions, récentes d'abord, sans les années vides", () => {
    expect(promotions(years)).toEqual([
      { year: 2025, label: "2025-26", group: "M1 Dev" },
      { year: 2024, label: "2024-25", group: "B3 Dev" },
    ]);
  });

  it("montre celle de l'année demandée, sinon la plus récente", () => {
    expect(promotionToShow(years, 2024)?.group).toBe("B3 Dev");
    expect(promotionToShow(years, 2023)).toBeNull();
    expect(promotionToShow(years)?.group).toBe("M1 Dev");
    expect(promotionToShow([])).toBeNull();
  });
});
