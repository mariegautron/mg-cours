import { describe, expect, it } from "vitest";

import { evaluatedLabel, validSelection } from "./evaluated-expectations";

describe("evaluatedLabel", () => {
  it("dit où on en est", () => {
    expect(evaluatedLabel(2, 6)).toBe("2 sur 6");
    expect(evaluatedLabel(0, 6)).toBe("Aucun sur 6");
    expect(evaluatedLabel(0, 0)).toBe("Aucun attendu dans le module");
  });
});

describe("validSelection", () => {
  it("ne garde que les attendus du module, sans doublon", () => {
    expect(validSelection(["a", "x", "a", "b"], ["a", "b", "c"])).toEqual(["a", "b"]);
  });
});
