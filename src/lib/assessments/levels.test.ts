import { describe, expect, it } from "vitest";

import { levelsMax, levelsSchema, sortLevels } from "./levels";

describe("levels", () => {
  it("trie du plus haut au plus bas sans modifier l'entrée", () => {
    const input = [{ points: 2 }, { points: 6 }, { points: 0 }, { points: 4 }];
    expect(sortLevels(input).map((l) => l.points)).toEqual([6, 4, 2, 0]);
    expect(input.map((l) => l.points)).toEqual([2, 6, 0, 4]);
  });

  it("donne le barème du critère (palier le plus haut) ou null", () => {
    expect(levelsMax([{ points: 1 }, { points: 8 }, { points: 4 }])).toBe(8);
    expect(levelsMax([])).toBeNull();
  });

  it("valide une liste vide (critère sans palier)", () => {
    expect(levelsSchema.safeParse([]).success).toBe(true);
  });

  it("refuse plus de 20 paliers", () => {
    const many = Array.from({ length: 21 }, (_, i) => ({ points: i, description: "" }));
    expect(levelsSchema.safeParse(many).success).toBe(false);
  });
});
