import { describe, expect, it } from "vitest";

import {
  compareCriterion,
  levelRank,
  pointsForRankKey,
  repeatedComments,
  sortCompareRows,
  sortedPoints,
  type CompareCopy,
} from "./compare";

const levels = [{ points: 6 }, { points: 4 }, { points: 2 }, { points: 0 }];
const copy = (
  id: string,
  points: number | null,
  comment?: string,
  absent = false,
): CompareCopy => ({
  id,
  title: id,
  scores: points === null ? {} : { c1: points },
  comments: comment ? { c1: comment } : {},
  absent,
});

describe("paliers", () => {
  it("tri du plus haut au plus bas, sans doublon", () => {
    expect(sortedPoints([{ points: 2 }, { points: 6 }, { points: 2 }, { points: 0 }])).toEqual([
      6, 2, 0,
    ]);
  });
  it("rang d'un palier, le plus proche si hors paliers", () => {
    expect(levelRank(levels, 6)).toBe(0);
    expect(levelRank(levels, 0)).toBe(3);
    expect(levelRank(levels, 3.9)).toBe(1);
    expect(levelRank(levels, 99)).toBe(0);
  });
  it("touche 1 à 4 = palier du plus haut au plus bas", () => {
    expect(pointsForRankKey(levels, "1")).toBe(6);
    expect(pointsForRankKey(levels, "4")).toBe(0);
    expect(pointsForRankKey(levels, "5")).toBeNull();
    expect(pointsForRankKey(levels, "a")).toBeNull();
  });
});

describe("compareCriterion", () => {
  const copies = [
    copy("g1", 6, "Très complet."),
    copy("g2", 4, "Choix non justifiés."),
    copy("g3", 2, "Choix non justifiés."),
    copy("g4", 4),
    copy("g5", null),
    copy("g6", 0, "x", true),
  ];
  const c = compareCriterion(copies, "c1", levels);

  it("répartition par palier, sans note, médiane ; les absent·es sont exclu·es", () => {
    expect(c.counts).toEqual([
      { points: 6, count: 1 },
      { points: 4, count: 2 },
      { points: 2, count: 1 },
      { points: 0, count: 0 },
    ]);
    expect(c.unscored).toBe(1);
    expect(c.median).toBe(4);
    expect(c.rows.find((r) => r.id === "g6")?.points).toBeNull();
  });

  it("écart en paliers avec la médiane ; signale à partir de 2 paliers", () => {
    const far = compareCriterion(
      [copy("a", 6), copy("b", 2), copy("c", 2), copy("d", 2)],
      "c1",
      levels,
    );
    expect(far.rows.find((r) => r.id === "a")?.steps).toBe(-2);
    expect(far.rows.find((r) => r.id === "a")?.flags).toContain("far_from_median");
    expect(c.rows.find((r) => r.id === "g1")?.flags).not.toContain("far_from_median");
  });

  it("même commentaire à des paliers différents ; palier sans commentaire", () => {
    expect(c.rows.find((r) => r.id === "g2")?.flags).toContain("same_comment_other_level");
    expect(c.rows.find((r) => r.id === "g3")?.flags).toContain("same_comment_other_level");
    expect(c.rows.find((r) => r.id === "g4")?.flags).toContain("no_comment");
    expect(c.rows.find((r) => r.id === "g1")?.flags).toEqual([]);
  });

  it("la comparaison du même commentaire ignore casse et espaces", () => {
    const r = compareCriterion(
      [copy("a", 4, " Choix  NON justifiés "), copy("b", 6, "choix non justifiés")],
      "c1",
      levels,
    );
    expect(r.rows[0].flags).toContain("same_comment_other_level");
  });

  it("aucune copie notée : médiane nulle, aucun écart", () => {
    const empty = compareCriterion([copy("a", null), copy("b", null)], "c1", levels);
    expect(empty.median).toBeNull();
    expect(empty.rows.every((r) => r.steps === null && r.flags.length === 0)).toBe(true);
    expect(empty.unscored).toBe(2);
  });
});

describe("sortCompareRows", () => {
  const rows = compareCriterion(
    [copy("b", 4), copy("a", 6), copy("d", null), copy("c", 2), copy("z", 0, "", true)],
    "c1",
    levels,
  ).rows;
  it("par nom, notées d'abord, absent·es en dernier", () => {
    expect(sortCompareRows(rows, "name").map((r) => r.id)).toEqual(["a", "b", "c", "d", "z"]);
  });
  it("par palier, décroissant ou croissant, non notées après", () => {
    expect(sortCompareRows(rows, "points_desc").map((r) => r.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
      "z",
    ]);
    expect(sortCompareRows(rows, "points_asc").map((r) => r.id)).toEqual(["c", "b", "a", "d", "z"]);
  });
  it("par écart : le plus éloigné de la médiane d'abord", () => {
    const wide = compareCriterion(
      [copy("a", 6), copy("b", 2), copy("c", 2), copy("d", 2), copy("e", 4)],
      "c1",
      levels,
    ).rows;
    expect(sortCompareRows(wide, "gap")[0].id).toBe("a");
  });
  it("ne modifie pas la liste d'origine", () => {
    const before = rows.map((r) => r.id);
    sortCompareRows(rows, "points_asc");
    expect(rows.map((r) => r.id)).toEqual(before);
  });
});

describe("repeatedComments", () => {
  it("regroupe les commentaires qui reviennent, du plus fréquent au moins fréquent", () => {
    const rows = compareCriterion(
      [
        copy("a", 4, "Choix non justifiés."),
        copy("b", 2, "choix non justifiés."),
        copy("c", 4, "Bien."),
        copy("d", 6, "Choix non justifiés."),
        copy("e", 6, "Bien."),
        copy("f", 0, "Seul."),
      ],
      "c1",
      levels,
    ).rows;
    const r = repeatedComments(rows);
    expect(r.map((g) => [g.comment, g.titles.length])).toEqual([
      ["Choix non justifiés.", 3],
      ["Bien.", 2],
    ]);
    expect(repeatedComments(rows, 4)).toEqual([]);
  });
});
