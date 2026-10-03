import { describe, expect, it } from "vitest";

import { nameMatches, removablePaths } from "./delete";

describe("nameMatches", () => {
  it("ignore casse, accents et espaces", () => {
    expect(nameMatches("methodologies  agile & scrum", "Méthodologies Agile & Scrum")).toBe(true);
  });
  it("refuse un nom différent ou vide", () => {
    expect(nameMatches("Méthodologies", "Méthodologies Agile & Scrum")).toBe(false);
    expect(nameMatches("", "")).toBe(false);
  });
});

describe("removablePaths", () => {
  it("garde les fichiers encore référencés ailleurs, sans doublon", () => {
    expect(removablePaths(["a", "b", "b", "c"], ["b"])).toEqual(["a", "c"]);
  });
});
