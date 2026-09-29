import { describe, expect, it } from "vitest";

import {
  computeTotals,
  describeOverflow,
  effectivePoints,
  formatNumber,
  groupByAxis,
  hasScoredInput,
  readScores,
} from "./scoring";

const criteria = [
  { id: "a1", weight: 6, axisId: "ax1" },
  { id: "a2", weight: 2, axisId: "ax1" },
  { id: "b1", weight: 12, axisId: "ax2" },
  { id: "b2", weight: 10, axisId: "ax2" },
  { id: "bonus", weight: 0.5, axisId: "ax2", isBonus: true },
];

describe("computeTotals", () => {
  it("donne les sous-totaux par axe et le total hors bonus", () => {
    const t = computeTotals(criteria, { a1: 4, a2: 2, b1: 6, b2: 10 });
    expect(t.axes).toEqual([
      { axisId: "ax1", points: 6, max: 8, bonusPoints: 0, bonusMax: 0 },
      { axisId: "ax2", points: 16, max: 22, bonusPoints: 0, bonusMax: 0.5 },
    ]);
    expect(t.base).toBe(22);
    expect(t.max).toBe(30);
    expect(t.value).toBe(22);
    expect(t.capped).toBe(false);
  });

  it("le bonus s'ajoute au total mais pas au barème", () => {
    const t = computeTotals(criteria, { a1: 6, a2: 2, b1: 6, b2: 10, bonus: 0.5 });
    expect(t.bonus).toBe(0.5);
    expect(t.max).toBe(30);
    expect(t.value).toBe(24.5);
  });

  it("ramène sur 20 puis plafonne à 20 : le bonus compense, ne dépasse jamais", () => {
    const t = computeTotals(
      criteria,
      { a1: 6, a2: 2, b1: 12, b2: 10, bonus: 0.5 },
      { maxScore: 20 },
    );
    expect(t.rawValue).toBe(20.33);
    expect(t.value).toBe(20);
    expect(t.capped).toBe(true);
    expect(t.rawOn20).toBe(20.33);
    expect(describeOverflow(t)).toBe("20,33 → plafonné à 20");
  });

  it("plafonne aussi sans barème explicite (barème = total de la grille)", () => {
    const t = computeTotals(criteria, { a1: 6, a2: 2, b1: 12, b2: 10, bonus: 0.5 });
    expect(t.maxScore).toBe(30);
    expect(t.value).toBe(30);
    expect(t.capped).toBe(true);
    expect(describeOverflow(t)).toBe("20,33 → plafonné à 20");
  });

  it("le bonus compense une perte ailleurs sans plafonner", () => {
    const t = computeTotals(
      criteria,
      { a1: 6, a2: 2, b1: 12, b2: 9, bonus: 0.5 },
      { maxScore: 20 },
    );
    expect(t.rawValue).toBe(19.67);
    expect(t.capped).toBe(false);
    expect(describeOverflow(t)).toBeNull();
  });

  it("valide d'office : palier le plus haut sans saisie, hors bonus", () => {
    const t = computeTotals(criteria, { a1: 0 }, { autoValidatedIds: ["a1", "bonus"] });
    expect(t.axes[0]).toMatchObject({ points: 6, max: 8 });
    expect(t.bonus).toBe(0);
  });

  it("regroupe les critères sans axe et traite une saisie absente comme 0", () => {
    const t = computeTotals([{ id: "x", weight: 4 }], {});
    expect(t.axes).toEqual([{ axisId: null, points: 0, max: 4, bonusPoints: 0, bonusMax: 0 }]);
    expect(t.value).toBe(0);
  });

  it("sans critère, renvoie 0 sur le barème demandé", () => {
    expect(computeTotals([], {}, { maxScore: 20 }).value).toBe(0);
  });
});

describe("effectivePoints", () => {
  it("borne la saisie à [0, barème] et ignore les valeurs non numériques", () => {
    const c = { id: "c", weight: 4 };
    expect(effectivePoints(c, { c: 9 })).toBe(4);
    expect(effectivePoints(c, { c: -2 })).toBe(0);
    expect(effectivePoints(c, { c: Number.NaN })).toBe(0);
    expect(effectivePoints(c, { c: null })).toBe(0);
  });
});

describe("formatNumber", () => {
  it("formate à la française", () => {
    expect(formatNumber(21.5)).toBe("21,5");
    expect(formatNumber(20)).toBe("20");
  });
});

describe("readScores", () => {
  it("ignore les champs vides, inconnus ou non numériques et borne les points", () => {
    const scores = readScores(
      [
        ["score_a1", "4"],
        ["score_a2", ""],
        ["score_b1", "99"],
        ["score_b2", "abc"],
        ["score_inconnu", "3"],
        ["feedback", "5"],
        ["score_bonus", "0,5"],
      ],
      criteria,
    );
    expect(scores).toEqual({ a1: 4, b1: 12, bonus: 0.5 });
  });
});

describe("groupByAxis", () => {
  const axes = [
    { id: "ax1", label: "Structure" },
    { id: "ax2", label: "Formulaires" },
    { id: "vide", label: "Sans critère" },
  ];

  it("range les critères par axe, sans axe à la fin, et omet les axes vides", () => {
    const groups = groupByAxis(
      [
        { id: "c1", axis_id: "ax2" },
        { id: "c2", axis_id: null },
        { id: "c3", axis_id: "ax1" },
        { id: "c4", axis_id: "supprimé" },
        { id: "c5", axis_id: "ax2" },
      ],
      axes,
    );
    expect(groups.map((g) => [g.axis?.label ?? null, g.criteria.map((c) => c.id)])).toEqual([
      ["Structure", ["c3"]],
      ["Formulaires", ["c1", "c5"]],
      [null, ["c2", "c4"]],
    ]);
  });

  it("une grille sans axe donne un seul groupe", () => {
    expect(
      groupByAxis(
        [
          { id: "c1", axis_id: null },
          { id: "c2", axis_id: null },
        ],
        [],
      ),
    ).toEqual([
      {
        axis: null,
        criteria: [
          { id: "c1", axis_id: null },
          { id: "c2", axis_id: null },
        ],
      },
    ]);
  });
});

describe("hasScoredInput", () => {
  it("vrai dès qu'un critère est noté (même à 0), faux pour une copie vierge", () => {
    expect(hasScoredInput(criteria, {})).toBe(false);
    expect(hasScoredInput(criteria, { a1: 0 })).toBe(true);
    expect(hasScoredInput(criteria, { a1: null, a2: undefined })).toBe(false);
  });

  it("vrai sans saisie quand tous les critères notés sont validés d'office (bonus exclu)", () => {
    expect(hasScoredInput(criteria, {}, ["a1", "a2", "b1", "b2"])).toBe(true);
    expect(hasScoredInput(criteria, {}, ["a1", "a2", "b1"])).toBe(false);
    expect(hasScoredInput([], {}, [])).toBe(false);
  });
});
