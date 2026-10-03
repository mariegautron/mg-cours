import { describe, expect, it } from "vitest";

import {
  countRepeated,
  defaultGroupNames,
  drawGroups,
  groupSizes,
  groupsFromChoices,
  pairKey,
  seenPairs,
  sizeSpread,
} from "./draw-groups";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `s${String(i).padStart(2, "0")}`);

describe("groupSizes", () => {
  it("groupes pleins + reste", () => {
    expect(groupSizes(7, 3, true, false)).toEqual([3, 3, 1]);
    expect(groupSizes(7, 3, false, false)).toEqual([3, 4]);
    expect(groupSizes(8, 3, true, false)).toEqual([3, 3, 2]);
  });
  it("équilibré : écart d'au plus 1", () => {
    expect(groupSizes(7, 3, true, true)).toEqual([3, 2, 2]);
    expect(groupSizes(10, 4, true, true)).toEqual([4, 3, 3]);
  });
  it("jamais de groupe d'une personne si non permis", () => {
    for (let n = 2; n <= 40; n++) {
      for (const size of [2, 3, 4, 5]) {
        for (const balanced of [true, false]) {
          const s = groupSizes(n, size, false, balanced);
          expect(s.reduce((a, b) => a + b, 0)).toBe(n);
          expect(s.includes(1)).toBe(false);
        }
      }
    }
  });
  it("groupes d'une personne permis et petits effectifs", () => {
    expect(groupSizes(1, 3, true, true)).toEqual([1]);
    expect(groupSizes(2, 5, false, true)).toEqual([2]);
    expect(groupSizes(0, 3, true, true)).toEqual([]);
    expect(groupSizes(5, 1, true, false)).toEqual([1, 1, 1, 1, 1]);
  });
});

describe("drawGroups", () => {
  it("répartit tout le monde une seule fois, reproductible", () => {
    const input = { studentIds: ids(13), size: 4, allowSingle: false, balanced: true, seed: "x" };
    const a = drawGroups(input);
    const b = drawGroups({ ...input, studentIds: [...ids(13)].reverse() });
    expect(a).toEqual(b);
    expect(a.groups.flat().sort()).toEqual(ids(13));
    expect(sizeSpread(a.groups)).toBeLessThanOrEqual(1);
    expect(drawGroups({ ...input, seed: "y" }).groups).not.toEqual(a.groups);
  });
  it("évite les binômes déjà vus quand c'est possible", () => {
    const people = ids(8);
    const past = [people.slice(0, 2), people.slice(2, 4), people.slice(4, 6), people.slice(6, 8)];
    const seen = seenPairs(past);
    const res = drawGroups({
      studentIds: people,
      size: 2,
      allowSingle: false,
      balanced: true,
      avoidPairs: seen,
      seed: "avoid",
    });
    expect(res.repeatedPairs).toBe(0);
    expect(countRepeated(res.groups, seen)).toBe(0);
  });
  it("répétition inévitable : le moins possible, et dite", () => {
    const people = ids(4);
    const seen = seenPairs([people]); // tout le monde déjà ensemble
    const res = drawGroups({
      studentIds: people,
      size: 2,
      allowSingle: false,
      balanced: true,
      avoidPairs: seen,
      seed: "z",
    });
    expect(res.repeatedPairs).toBe(2);
  });
});

describe("helpers", () => {
  it("pairKey ne dépend pas de l'ordre", () => {
    expect(pairKey("a", "b")).toBe(pairKey("b", "a"));
  });
  it("choix manuel : groupes d'une personne permis, 0 = sans groupe", () => {
    expect(groupsFromChoices({ a: 1, b: 2, c: 1, d: 0, e: 3 }, 3)).toEqual([
      ["a", "c"],
      ["b"],
      ["e"],
    ]);
    expect(groupsFromChoices({ a: 2 }, 3)).toEqual([["a"]]);
  });
  it("noms par défaut sans collision", () => {
    expect(defaultGroupNames(3, ["groupe 2"])).toEqual(["Groupe 1", "Groupe 3", "Groupe 4"]);
  });
});
