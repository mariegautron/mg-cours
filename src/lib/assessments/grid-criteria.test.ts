import { describe, expect, it } from "vitest";

import { diffCriteria, readCriteriaInput, type ExistingCriterion } from "./grid-criteria";

const existing: ExistingCriterion[] = [
  { id: "a", label: "Présentation", weight: 4, description: null },
  { id: "b", label: "Démonstration", weight: 6, description: "6 pts : excellent" },
  { id: "c", label: "Qualité du code", weight: 10, description: null },
];

describe("diffCriteria", () => {
  it("ne change rien quand la liste soumise est identique", () => {
    const diff = diffCriteria(existing, [
      { id: "a", label: "Présentation", weight: 4, description: "" },
      { id: "b", label: "Démonstration", weight: 6, description: "6 pts : excellent" },
      { id: "c", label: "Qualité du code", weight: 10, description: "" },
    ]);
    expect(diff.toInsert).toEqual([]);
    expect(diff.toDelete).toEqual([]);
    expect(diff.toUpdate).toHaveLength(3);
  });

  it("détecte un renommage et un changement de points en conservant l'identifiant", () => {
    const diff = diffCriteria(existing, [
      { id: "a", label: "Présentation orale", weight: 5, description: "" },
      { id: "b", label: "Démonstration", weight: 6, description: "6 pts : excellent" },
      { id: "c", label: "Qualité du code", weight: 10, description: "" },
    ]);
    expect(diff.toUpdate).toContainEqual({
      id: "a",
      label: "Présentation orale",
      weight: 5,
      description: null,
      position: 0,
      levels: [],
    });
    expect(diff.toInsert).toEqual([]);
    expect(diff.toDelete).toEqual([]);
  });

  it("recalcule la position selon l'ordre soumis (réordonnancement)", () => {
    const diff = diffCriteria(existing, [
      { id: "c", label: "Qualité du code", weight: 10, description: "" },
      { id: "a", label: "Présentation", weight: 4, description: "" },
      { id: "b", label: "Démonstration", weight: 6, description: "" },
    ]);
    expect(diff.toUpdate.find((c) => c.id === "c")?.position).toBe(0);
    expect(diff.toUpdate.find((c) => c.id === "a")?.position).toBe(1);
    expect(diff.toUpdate.find((c) => c.id === "b")?.position).toBe(2);
  });

  it("ajoute un nouveau critère (sans id)", () => {
    const diff = diffCriteria(existing, [
      { id: "a", label: "Présentation", weight: 4, description: "" },
      { id: "b", label: "Démonstration", weight: 6, description: "" },
      { id: "c", label: "Qualité du code", weight: 10, description: "" },
      { label: "Bonus", weight: 2, description: "" },
    ]);
    expect(diff.toInsert).toEqual([
      { label: "Bonus", weight: 2, description: null, position: 3, levels: [] },
    ]);
    expect(diff.toDelete).toEqual([]);
  });

  it("supprime les critères absents de la liste soumise", () => {
    const diff = diffCriteria(existing, [
      { id: "a", label: "Présentation", weight: 4, description: "" },
    ]);
    expect(diff.toDelete.sort()).toEqual(["b", "c"]);
  });

  it("ignore un identifiant qui appartient à une autre grille (traité comme une création)", () => {
    const diff = diffCriteria(existing, [
      { id: "a", label: "Présentation", weight: 4, description: "" },
      { id: "b", label: "Démonstration", weight: 6, description: "" },
      { id: "c", label: "Qualité du code", weight: 10, description: "" },
      { id: "zzzz-inconnu", label: "Copié d'une autre grille", weight: 3, description: "" },
    ]);
    expect(diff.toInsert).toEqual([
      { label: "Copié d'une autre grille", weight: 3, description: null, position: 3, levels: [] },
    ]);
    expect(diff.toDelete).toEqual([]);
  });
});

describe("diffCriteria — paliers", () => {
  it("transmet les paliers soumis sans changer l'identifiant du critère", () => {
    const levels = [
      { points: 6, description: "Excellent" },
      { points: 0, description: "" },
    ];
    const diff = diffCriteria(existing, [
      { id: "a", label: "Présentation", weight: 6, description: "", levels },
      { label: "Nouveau", weight: 2, description: "", levels: [{ points: 2, description: "" }] },
    ]);
    expect(diff.toUpdate[0]).toMatchObject({ id: "a", levels });
    expect(diff.toInsert[0].levels).toEqual([{ points: 2, description: "" }]);
    expect(diff.toDelete.sort()).toEqual(["b", "c"]);
  });
});

describe("readCriteriaInput", () => {
  it("valide un JSON de critères bien formé", () => {
    const result = readCriteriaInput(
      JSON.stringify([{ label: "Présentation", weight: 4, description: "" }]),
    );
    expect(result).toEqual({
      criteria: [{ label: "Présentation", weight: 4, description: "", levels: [] }],
    });
  });

  it("dérive le barème du palier le plus haut et trie les paliers du plus haut au plus bas", () => {
    const result = readCriteriaInput(
      JSON.stringify([
        {
          label: "Structure",
          weight: 1,
          description: "",
          levels: [
            { points: 0, description: "Non corrigée" },
            { points: 6, description: "Correcte" },
            { points: 2, description: "" },
            { points: 4, description: "Approximative" },
          ],
        },
      ]),
    );
    expect(result).toEqual({
      criteria: [
        {
          label: "Structure",
          weight: 6,
          description: "",
          levels: [
            { points: 6, description: "Correcte" },
            { points: 4, description: "Approximative" },
            { points: 2, description: "" },
            { points: 0, description: "Non corrigée" },
          ],
        },
      ],
    });
  });

  it("accepte des paliers décimaux et un nombre libre de paliers (2/1/0)", () => {
    const result = readCriteriaInput(
      JSON.stringify([
        {
          label: "Bouton",
          weight: 2,
          description: "",
          levels: [{ points: 2 }, { points: 1 }, { points: 0.5 }, { points: 0 }],
        },
      ]),
    );
    expect("criteria" in result && result.criteria[0].weight).toBe(2);
  });

  it("refuse des paliers en double, négatifs, ou tous à 0", () => {
    const bad = (levels: unknown[]) =>
      "error" in
      readCriteriaInput(JSON.stringify([{ label: "X", weight: 2, description: "", levels }]));
    expect(bad([{ points: 2 }, { points: 2 }])).toBe(true);
    expect(bad([{ points: -1 }, { points: 2 }])).toBe(true);
    expect(bad([{ points: 0 }])).toBe(true);
  });

  it("refuse un JSON invalide", () => {
    expect(readCriteriaInput("pas du json")).toEqual({ error: "Critères invalides." });
  });

  it("refuse une liste vide", () => {
    const result = readCriteriaInput("[]");
    expect("error" in result).toBe(true);
  });

  it("refuse un critère sans libellé ou avec des points invalides", () => {
    expect(
      "error" in readCriteriaInput(JSON.stringify([{ label: "", weight: 4, description: "" }])),
    ).toBe(true);
    expect(
      "error" in readCriteriaInput(JSON.stringify([{ label: "X", weight: 0, description: "" }])),
    ).toBe(true);
  });
});
