import { describe, expect, it } from "vitest";

import {
  coverageSegments,
  filterByState,
  filterCounts,
  parseMatchingFilter,
  selectedExpectationId,
} from "./matching-view";

const rows = [
  { id: "a", state: "covered" as const },
  { id: "b", state: "uncovered" as const },
  { id: "c", state: "to_build" as const },
];

describe("filtres", () => {
  it("lit un filtre connu, sinon « tous »", () => {
    expect(parseMatchingFilter("covered")).toBe("covered");
    expect(parseMatchingFilter("n'importe quoi")).toBe("all");
    expect(parseMatchingFilter(undefined)).toBe("all");
  });
  it("filtre et compte par état", () => {
    expect(filterByState(rows, "all")).toHaveLength(3);
    expect(filterByState(rows, "uncovered").map((r) => r.id)).toEqual(["b"]);
    expect(filterCounts(rows.map((r) => r.state))).toEqual({
      all: 3,
      uncovered: 1,
      to_build: 1,
      covered: 1,
    });
  });
});

describe("selectedExpectationId", () => {
  it("garde l'attendu demandé s'il existe", () => {
    expect(selectedExpectationId(rows, "c")).toBe("c");
  });
  it("sinon ouvre le premier attendu non couvert", () => {
    expect(selectedExpectationId(rows, undefined)).toBe("b");
    expect(selectedExpectationId(rows, "inconnu")).toBe("b");
  });
  it("tout couvert : le premier ; rien : null", () => {
    expect(selectedExpectationId([{ id: "z", state: "covered" }], undefined)).toBe("z");
    expect(selectedExpectationId([], "a")).toBeNull();
  });
});

describe("coverageSegments", () => {
  it("largeurs de la barre", () => {
    expect(coverageSegments({ covered: 3, toBuild: 1, uncovered: 3, total: 7 })).toEqual({
      covered: 42.9,
      toBuild: 14.3,
    });
    expect(coverageSegments({ covered: 0, toBuild: 0, uncovered: 0, total: 0 })).toEqual({
      covered: 0,
      toBuild: 0,
    });
  });
});
