import { describe, expect, it } from "vitest";

import {
  appendComment,
  findLevel,
  levelCommentBase,
  levelsMax,
  levelsSchema,
  sortLevels,
} from "./levels";

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

describe("findLevel", () => {
  const levels = [
    { points: 6, description: "Excellent" },
    { points: 4, description: "Correct" },
    { points: 0, description: "" },
  ];

  it("trouve le palier exact, y compris 0", () => {
    expect(findLevel(levels, 4)?.description).toBe("Correct");
    expect(findLevel(levels, 0)?.points).toBe(0);
  });

  it("renvoie null pour une saisie hors palier, vide ou invalide", () => {
    expect(findLevel(levels, 5)).toBeNull();
    expect(findLevel(levels, null)).toBeNull();
    expect(findLevel(levels, undefined)).toBeNull();
    expect(findLevel(levels, Number.NaN)).toBeNull();
  });
});

describe("levelCommentBase / appendComment", () => {
  it("propose « Critère — description » ou rien sans description", () => {
    expect(levelCommentBase("Structure", { description: " Bien structuré " })).toBe(
      "Structure — Bien structuré",
    );
    expect(levelCommentBase("Structure", { description: "  " })).toBeNull();
    expect(levelCommentBase("Structure", null)).toBeNull();
  });

  it("ajoute sur une nouvelle ligne sans écraser le texte déjà saisi", () => {
    expect(appendComment("", "A")).toBe("A");
    expect(appendComment("Déjà écrit.  \n", "A")).toBe("Déjà écrit.\nA");
  });
});
