import { describe, expect, it } from "vitest";

import { moveInOrder, nextPosition, renumber } from "./reorder";

describe("moveInOrder", () => {
  const ids = ["a", "b", "c"];

  it("monte et descend d'un rang", () => {
    expect(moveInOrder(ids, "b", "up")).toEqual(["b", "a", "c"]);
    expect(moveInOrder(ids, "b", "down")).toEqual(["a", "c", "b"]);
  });

  it("ne bouge pas en bout de liste ni pour un identifiant inconnu", () => {
    expect(moveInOrder(ids, "a", "up")).toEqual(ids);
    expect(moveInOrder(ids, "c", "down")).toEqual(ids);
    expect(moveInOrder(ids, "x", "up")).toEqual(ids);
  });

  it("ne modifie pas la liste d'origine", () => {
    moveInOrder(ids, "b", "up");
    expect(ids).toEqual(["a", "b", "c"]);
  });
});

describe("renumber", () => {
  it("numérote de 1 à N dans l'ordre donné", () => {
    expect(renumber(["b", "a"])).toEqual([
      { id: "b", position: 1 },
      { id: "a", position: 2 },
    ]);
    expect(renumber([])).toEqual([]);
  });
});

describe("nextPosition", () => {
  it("place la nouvelle séance en dernier, même avec des positions à 0 ou avec des trous", () => {
    expect(nextPosition([])).toBe(1);
    expect(nextPosition([1, 2, 3])).toBe(4);
    expect(nextPosition([0, 0])).toBe(3);
    expect(nextPosition([2, 9])).toBe(10);
  });
});
