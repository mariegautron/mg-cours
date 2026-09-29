import { describe, expect, it } from "vitest";

import { drawThemes, seededRandom, shuffle } from "./draw";

const groups = ["g1", "g2", "g3", "g4", "g5", "g6", "g7"];
const themes = ["a", "b", "c"];

function countBy(result: { themeId: string }[]) {
  const counts: Record<string, number> = {};
  for (const r of result) counts[r.themeId] = (counts[r.themeId] ?? 0) + 1;
  return counts;
}

describe("seededRandom / shuffle", () => {
  it("même graine → même suite ; graine différente → suite différente", () => {
    const a = seededRandom("x");
    const b = seededRandom("x");
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(seededRandom("x")()).not.toBe(seededRandom("y")());
  });

  it("le mélange garde tous les éléments et ne modifie pas l'entrée", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, seededRandom("s"));
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("drawThemes", () => {
  it("affecte chaque groupe une seule fois", () => {
    const r = drawThemes({ groupIds: groups, themeIds: themes, volunteers: {}, seed: "s1" });
    expect(r.map((x) => x.groupId).sort()).toEqual([...groups].sort());
    expect(r.every((x) => x.method === "draw")).toBe(true);
  });

  it("reproductible, quel que soit l'ordre des listes", () => {
    const one = drawThemes({ groupIds: groups, themeIds: themes, volunteers: {}, seed: "s1" });
    const two = drawThemes({
      groupIds: [...groups].reverse(),
      themeIds: [...themes].reverse(),
      volunteers: {},
      seed: "s1",
    });
    const key = (r: typeof one) => r.map((x) => `${x.groupId}:${x.themeId}`).sort();
    expect(key(two)).toEqual(key(one));
  });

  it("la graine change le tirage (au moins pour une des graines essayées)", () => {
    const base = JSON.stringify(
      drawThemes({ groupIds: groups, themeIds: themes, volunteers: {}, seed: "s1" }).sort((a, b) =>
        a.groupId.localeCompare(b.groupId),
      ),
    );
    const others = ["s2", "s3", "s4", "s5"].map((seed) =>
      JSON.stringify(
        drawThemes({ groupIds: groups, themeIds: themes, volunteers: {}, seed }).sort((a, b) =>
          a.groupId.localeCompare(b.groupId),
        ),
      ),
    );
    expect(others.some((o) => o !== base)).toBe(true);
  });

  it("sans remise tant qu'il reste des thèmes : 3 groupes → 3 thèmes différents", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const r = drawThemes({
        groupIds: ["g1", "g2", "g3"],
        themeIds: themes,
        volunteers: {},
        seed,
      });
      expect(new Set(r.map((x) => x.themeId)).size).toBe(3);
    }
  });

  it("plus de groupes que de thèmes : répartition équitable (écart ≤ 1)", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const counts = Object.values(
        countBy(drawThemes({ groupIds: groups, themeIds: themes, volunteers: {}, seed })),
      );
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    }
  });

  it("les volontaires sont affectés d'abord et comptent dans l'équité", () => {
    const r = drawThemes({
      groupIds: ["g1", "g2", "g3"],
      themeIds: themes,
      volunteers: { g1: "b" },
      seed: "s",
    });
    expect(r.find((x) => x.groupId === "g1")).toEqual({
      groupId: "g1",
      themeId: "b",
      method: "volunteer",
    });
    // Les deux autres groupes se partagent les thèmes restants : personne d'autre sur « b ».
    const others = r.filter((x) => x.method === "draw").map((x) => x.themeId);
    expect(others.sort()).toEqual(["a", "c"]);
  });

  it("ignore un volontaire pour un thème ou un groupe inconnu", () => {
    const r = drawThemes({
      groupIds: ["g1"],
      themeIds: themes,
      volunteers: { g1: "zzz", ghost: "a" },
      seed: "s",
    });
    expect(r).toHaveLength(1);
    expect(r[0].method).toBe("draw");
  });

  it("sans thème : aucune affectation tirée", () => {
    expect(drawThemes({ groupIds: groups, themeIds: [], volunteers: {}, seed: "s" })).toEqual([]);
  });
});
