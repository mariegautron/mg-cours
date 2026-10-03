import { describe, expect, it } from "vitest";

import { availableQuestions, pickQuestions, rulesForPool, toggleQuestion } from "./generate";

const by = (o: Record<string, string[]>) => new Map(Object.entries(o));

describe("pickQuestions", () => {
  it("reproductible, sans doublon, bon nombre", () => {
    const input = {
      byResource: by({ r1: ["a", "b", "c", "d"], r2: ["e", "f", "g"] }),
      count: 5,
      seed: "s",
    };
    const a = pickQuestions(input);
    expect(a).toEqual(
      pickQuestions({
        ...input,
        byResource: by({ r2: ["g", "f", "e"], r1: ["d", "c", "b", "a"] }),
      }),
    );
    expect(a.picked).toHaveLength(5);
    expect(new Set(a.picked).size).toBe(5);
    expect(a.missing).toBe(0);
  });
  it("répartition la plus égale possible entre les ressources", () => {
    const res = pickQuestions({
      byResource: by({ r1: ["a", "b", "c", "d"], r2: ["e", "f", "g", "h"] }),
      count: 4,
      seed: "x",
    });
    expect([...res.perResource.values()].sort()).toEqual([2, 2]);
    const odd = pickQuestions({
      byResource: by({ r1: ["a", "b", "c"], r2: ["d", "e", "f"], r3: ["g", "h", "i"] }),
      count: 4,
      seed: "y",
    });
    expect([...odd.perResource.values()].sort()).toEqual([1, 1, 2]);
  });
  it("une ressource courte laisse la place aux autres", () => {
    const res = pickQuestions({
      byResource: by({ r1: ["a"], r2: ["b", "c", "d", "e"] }),
      count: 4,
      seed: "z",
    });
    expect(res.perResource.get("r1")).toBe(1);
    expect(res.perResource.get("r2")).toBe(3);
  });
  it("pas assez de questions : tout est pris, le manque est dit", () => {
    const res = pickQuestions({ byResource: by({ r1: ["a", "b"] }), count: 5, seed: "q" });
    expect(res.picked).toHaveLength(2);
    expect(res.missing).toBe(3);
  });
  it("une question liée à deux ressources n'est prise qu'une fois", () => {
    const res = pickQuestions({
      byResource: by({ r1: ["a", "b"], r2: ["a", "c"] }),
      count: 3,
      seed: "d",
    });
    expect([...res.picked].sort()).toEqual(["a", "b", "c"]);
  });
  it("graines différentes, tirages différents (en général)", () => {
    const base = { byResource: by({ r1: ["a", "b", "c", "d", "e", "f", "g", "h"] }), count: 3 };
    const sets = new Set(
      ["1", "2", "3", "4", "5"].map((seed) => pickQuestions({ ...base, seed }).picked.join()),
    );
    expect(sets.size).toBeGreaterThan(1);
  });
  it("zéro demandée", () => {
    expect(pickQuestions({ byResource: by({ r1: ["a"] }), count: 0, seed: "s" }).picked).toEqual(
      [],
    );
  });
});

describe("sélection manuelle et règles", () => {
  it("union dédoublonnée des ressources choisies", () => {
    expect(
      availableQuestions(by({ r1: ["a", "b"], r2: ["b", "c"], r3: ["z"] }), ["r1", "r2"]).sort(),
    ).toEqual(["a", "b", "c"]);
  });
  it("ajout / retrait sans doublon", () => {
    expect(toggleQuestion(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleQuestion(["a", "b"], "a")).toEqual(["b"]);
  });
  it("une règle par type, points les plus fréquents, effectifs exacts", () => {
    const rules = rulesForPool([
      { id: "1", type: "multichoice" as never, defaultPoints: 1 },
      { id: "2", type: "multichoice" as never, defaultPoints: 1 },
      { id: "3", type: "multichoice" as never, defaultPoints: 2 },
      { id: "4", type: "open" as never, defaultPoints: 3 },
    ]);
    expect(rules).toHaveLength(2);
    expect(rules.find((r) => r.types[0] === ("multichoice" as never))).toMatchObject({
      count: 3,
      pointsEach: 1,
    });
    expect(rules.find((r) => r.types[0] === ("open" as never))).toMatchObject({
      count: 1,
      pointsEach: 3,
    });
    expect(rulesForPool([])).toEqual([]);
  });
});
