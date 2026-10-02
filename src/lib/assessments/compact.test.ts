import { describe, expect, it } from "vitest";

import {
  axisComment,
  axisCommentKey,
  criteriaToFillWithMiddle,
  levelForDigit,
  middleLevel,
  moveCriterion,
} from "./compact";

const lv = (...points: number[]) => points.map((p) => ({ points: p }));

describe("middleLevel", () => {
  it("le palier du milieu, le plus haut des deux au milieu si pair", () => {
    expect(middleLevel(lv(6, 4, 2, 0))?.points).toBe(4);
    expect(middleLevel(lv(3, 2, 1, 0))?.points).toBe(2);
    expect(middleLevel(lv(2, 1, 0))?.points).toBe(1);
    expect(middleLevel(lv(5))?.points).toBe(5);
    expect(middleLevel(lv(0, 2))?.points).toBe(2);
  });
  it("indépendant de l'ordre d'entrée, vide → null", () => {
    expect(middleLevel(lv(0, 6, 2, 4))?.points).toBe(4);
    expect(middleLevel([])).toBeNull();
  });
});

describe("levelForDigit", () => {
  it("un chiffre choisit le palier de ces points", () => {
    expect(levelForDigit(lv(3, 2, 1, 0), "2")?.points).toBe(2);
    expect(levelForDigit(lv(3, 2, 1, 0), "0")?.points).toBe(0);
    expect(levelForDigit(lv(6, 4, 2, 0), "4")?.points).toBe(4);
  });
  it("aucun palier de ces points, ou touche qui n'est pas un chiffre : rien", () => {
    expect(levelForDigit(lv(6, 4, 2, 0), "5")).toBeNull();
    expect(levelForDigit(lv(6, 4, 2, 0), "a")).toBeNull();
    expect(levelForDigit(lv(6, 4, 2, 0), "12")).toBeNull();
  });
});

describe("moveCriterion", () => {
  it("↑ ↓ sans boucle", () => {
    expect(moveCriterion(0, "ArrowDown", 3)).toBe(1);
    expect(moveCriterion(2, "ArrowDown", 3)).toBeNull();
    expect(moveCriterion(2, "ArrowUp", 3)).toBe(1);
    expect(moveCriterion(0, "ArrowUp", 3)).toBeNull();
    expect(moveCriterion(0, "x", 3)).toBeNull();
    expect(moveCriterion(0, "ArrowDown", 0)).toBeNull();
  });
});

describe("criteriaToFillWithMiddle", () => {
  const criteria = [
    { id: "a", levels: lv(6, 4, 2, 0) },
    { id: "b", levels: lv(6, 4, 2, 0) },
    { id: "bonus", is_bonus: true, levels: lv(2, 1, 0) },
    { id: "auto", levels: lv(2, 1, 0) },
    { id: "libre", levels: [] },
  ];
  it("ne remplit que les critères à paliers, non bonus, non validés, sans note", () => {
    expect(criteriaToFillWithMiddle(criteria, { a: "6" }, ["auto"])).toEqual([
      { id: "b", points: 4 },
    ]);
  });
  it("une note déjà saisie (même 0) n'est jamais écrasée", () => {
    expect(criteriaToFillWithMiddle(criteria, { a: "0", b: "2" }, ["auto"])).toEqual([]);
    expect(criteriaToFillWithMiddle(criteria, { a: "  " }, ["auto"]).map((c) => c.id)).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("commentaire d'axe", () => {
  it("clé dédiée dans les commentaires enregistrés", () => {
    expect(axisCommentKey("ax1")).toBe("axis:ax1");
    expect(axisComment({ "axis:ax1": "Clair." }, "ax1")).toBe("Clair.");
    expect(axisComment({}, "ax1")).toBe("");
  });
});
