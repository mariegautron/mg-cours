import { describe, expect, it } from "vitest";

import { noteProgress, requiredNotes, weightedAverage } from "./notation";

describe("requiredNotes", () => {
  it.each([
    [4, 2, 1, 1],
    [12, 2, 1, 1],
    [16, 2, 1, 1],
    [20, 3, 2, 1],
    [21, 3, 2, 1], // Méthodologies Agile & Scrum (YCODE A2627_4752)
    [42, 3, 2, 1], // Développement Web Avancé (MyDigitalSchool)
    [48, 3, 2, 1],
    [52, 5, 3, 2],
    [70, 5, 3, 2],
  ])("%ih → %i notes (%i groupe + %i individuelle)", (h, total, group, individual) => {
    const r = requiredNotes(h);
    expect(r).toMatchObject({ total, group, individual, exact: true });
  });

  it("gère un volume nul ou invalide", () => {
    expect(requiredNotes(0)).toMatchObject({ total: 0, exact: false });
    expect(requiredNotes(-5)).toMatchObject({ total: 0, exact: false });
    expect(requiredNotes(Number.NaN)).toMatchObject({ total: 0, exact: false });
  });

  it("extrapole hors palier en signalant exact=false", () => {
    expect(requiredNotes(18)).toMatchObject({ exact: false }); // entre 16 et 20
    expect(requiredNotes(50)).toMatchObject({ exact: false }); // entre 48 et 52
    expect(requiredNotes(90).exact).toBe(false); // au-delà de 70
  });
});

describe("weightedAverage", () => {
  it("applique les coefficients YNOV (groupe ×1, individuel ×3)", () => {
    // Exemple de la doc : 2 notes de groupe + 1 note individuelle.
    const r = weightedAverage([
      { value: 14, kind: "group" },
      { value: 16, kind: "group" },
      { value: 12, kind: "individual" },
    ]);
    expect(r.points).toBe(14 * 1 + 16 * 1 + 12 * 3); // 66
    expect(r.weight).toBe(1 + 1 + 3); // 5
    expect(r.average).toBeCloseTo(66 / 5);
  });

  it("renvoie une moyenne nulle sans note", () => {
    expect(weightedAverage([])).toMatchObject({ points: 0, weight: 0, average: null });
  });
});

describe("noteProgress", () => {
  it("détecte un minimum atteint pour un module de 21h", () => {
    const p = noteProgress(21, { group: 2, individual: 1 });
    expect(p.satisfied).toBe(true);
    expect(p.enteredTotal).toBe(3);
  });

  it("liste ce qui manque", () => {
    const p = noteProgress(21, { group: 1, individual: 0 });
    expect(p.satisfied).toBe(false);
    expect(p.missingGroup).toBe(1);
    expect(p.missingIndividual).toBe(1);
  });
});
