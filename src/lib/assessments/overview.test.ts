import { describe, expect, it } from "vitest";

import {
  copyState,
  correctionOverview,
  filterRows,
  submissionLabel,
  progressNote,
  scoredCount,
  type OverviewItem,
} from "./overview";

const crit = ["c1", "c2", "c3", "c4"];
const item = (id: string, grade: OverviewItem["grade"]): OverviewItem => ({ id, title: id, grade });

describe("copyState", () => {
  it("pas de ligne ou ligne vide : à corriger", () => {
    expect(copyState(undefined, crit)).toBe("todo");
    expect(copyState(null, crit)).toBe("todo");
    expect(copyState({ value: null, scores: {} }, crit)).toBe("todo");
    expect(
      copyState({ value: null, scores: null, criterion_comments: {}, feedback: "  " }, crit),
    ).toBe("todo");
  });
  it("une saisie sans note finale : en cours", () => {
    expect(copyState({ value: null, scores: { c1: 4 } }, crit)).toBe("in_progress");
    expect(copyState({ value: null, scores: {}, criterion_comments: { c2: "Bien" } }, crit)).toBe(
      "in_progress",
    );
    expect(copyState({ value: null, scores: {}, feedback: "À revoir" }, crit)).toBe("in_progress");
  });
  it("une note enregistrée : corrigée (même 0)", () => {
    expect(copyState({ value: 0, scores: {} }, crit)).toBe("done");
    expect(copyState({ value: 15.5, scores: { c1: 6 } }, [])).toBe("done");
  });
  it("une saisie hors des critères de la grille ne compte pas", () => {
    expect(copyState({ value: null, scores: { autre: 3 } }, crit)).toBe("todo");
  });
});

describe("scoredCount", () => {
  it("compte les critères notés, validés d'office compris, ignore les valeurs non numériques", () => {
    expect(scoredCount({ c1: 2, c2: null, c3: "x" }, crit)).toBe(1);
    expect(scoredCount({ c1: 2 }, crit, ["c4"])).toBe(2);
    expect(scoredCount("pas un objet", crit)).toBe(0);
  });
});

describe("correctionOverview", () => {
  const items = [
    item("g1", { value: 15.5, scores: { c1: 6 } }),
    item("g2", { value: null, scores: { c1: 4, c2: 2 } }),
    item("g3", undefined),
    item("g4", { value: 13, scores: {} }),
    item("g5", undefined),
  ];
  const o = correctionOverview(items, crit);
  it("avancement et libellé", () => {
    expect([o.done, o.inProgress, o.todo, o.total]).toEqual([2, 1, 2, 5]);
    expect(o.label).toBe("2 corrigés sur 5");
    expect(correctionOverview([item("a", { value: 1, scores: {} })], crit).label).toBe(
      "1 corrigé sur 1",
    );
    expect(correctionOverview([], crit).label).toBe("0 corrigé sur 0");
  });
  it("moyenne des seules copies corrigées", () => {
    expect(o.average).toBe(14.25);
    expect(correctionOverview([item("a", undefined)], crit).average).toBeNull();
  });
  it("« Continuer » reprend la copie en cours avant la première à corriger", () => {
    expect(o.next?.id).toBe("g2");
    const noneInProgress = correctionOverview([items[0], items[2], items[3]], crit);
    expect(noneInProgress.next?.id).toBe("g3");
  });
  it("rien à continuer quand tout est corrigé", () => {
    expect(correctionOverview([items[0], items[3]], crit).next).toBeNull();
  });
  it("critères notés sur le total, ou null sans grille", () => {
    const r = o.rows.find((x) => x.id === "g2")!;
    expect([r.scored, r.total]).toEqual([2, 4]);
    expect(progressNote(r)).toBe("2 critères sur 4 notés.");
    const direct = correctionOverview([items[0]], []).rows[0];
    expect([direct.scored, direct.total]).toEqual([null, null]);
    expect(progressNote(direct)).toBe("");
    expect(progressNote({ scored: 1, total: 4 })).toBe("1 critère sur 4 noté.");
  });
  it("la note n'est affichée que pour une copie corrigée", () => {
    expect(o.rows.map((r) => r.value)).toEqual([15.5, null, null, 13, null]);
  });
});

describe("filterRows", () => {
  const o = correctionOverview(
    [
      item("a", { value: 10, scores: {} }),
      item("b", { value: null, scores: { c1: 1 } }),
      item("c", undefined),
    ],
    crit,
  );
  it("tous, à corriger (inclut en cours), corrigés", () => {
    expect(filterRows(o.rows, "all")).toHaveLength(3);
    expect(filterRows(o.rows, "todo").map((r) => r.id)).toEqual(["b", "c"]);
    expect(filterRows(o.rows, "done").map((r) => r.id)).toEqual(["a"]);
  });
});

describe("rendus (évaluation individuelle)", () => {
  const rows = correctionOverview([
    { id: "a", title: "Ana", received: true },
    { id: "b", title: "Ben", received: false, attendance: "absent_excused" },
    { id: "c", title: "Cléo", received: false, attendance: "absent_unexcused" },
    { id: "d", title: "Dan", received: false },
  ]).rows;
  it("filtre les non rendus", () => {
    expect(filterRows(rows, "missing").map((r) => r.id)).toEqual(["b", "c", "d"]);
  });
  it("dit le rendu en mots, avec l'absence", () => {
    expect(rows.map((r) => submissionLabel(r)?.label)).toEqual([
      "Rendu reçu",
      "Non rendu, excusé·e",
      "Non rendu, non prévenu·e",
      "Non rendu",
    ]);
    expect(submissionLabel({ received: undefined, attendance: null })).toBeNull();
  });
});
