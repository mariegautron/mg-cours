import { describe, expect, it } from "vitest";

import { buildGridHandout } from "./grid-handout";

const criterion = (over: Partial<Parameters<typeof buildGridHandout>[0]["criteria"][number]>) => ({
  label: "Critère",
  description: null,
  reference: null,
  weight: 4,
  is_bonus: false,
  axis_id: null,
  position: 0,
  levels: [],
  ...over,
});

describe("buildGridHandout", () => {
  const grid = {
    name: "Grille oral",
    description: "  Soutenance finale ",
    axes: [
      { id: "a2", label: "Technique", position: 1 },
      { id: "a1", label: "Présentation", position: 0 },
    ],
    criteria: [
      criterion({
        label: "Démo",
        axis_id: "a2",
        weight: 4,
        position: 0,
        reference: "RGAA 7.1",
        description: "Site déployé",
        levels: [
          { points: 0, description: "Absent" },
          { points: 4, description: "Complet" },
          { points: 2, description: null },
        ],
      }),
      criterion({ label: "Persona", axis_id: "a1", weight: 2, position: 1 }),
      criterion({ label: "Bonus éco", axis_id: "a2", weight: 1, is_bonus: true, position: 2 }),
      criterion({ label: "Sans axe", weight: 3, position: 3 }),
    ],
  };

  it("range les axes dans l'ordre, puis les critères sans axe", () => {
    const h = buildGridHandout(grid);
    expect(h.axes.map((a) => a.label)).toEqual(["Présentation", "Technique", null]);
    expect(h.hasAxes).toBe(true);
  });

  it("calcule sous-totaux et bonus hors barème", () => {
    const h = buildGridHandout(grid);
    const technique = h.axes.find((a) => a.label === "Technique")!;
    expect(technique.max).toBe(4);
    expect(technique.bonusMax).toBe(1);
    expect(h.bonusMax).toBe(1);
    expect(h.maxScore).toBe(9);
  });

  it("paliers du plus haut au plus bas, description vide gardée en texte vide", () => {
    const demo = buildGridHandout(grid).axes[1].criteria[0];
    expect(demo.levels.map((l) => l.points)).toEqual([4, 2, 0]);
    expect(demo.levels[1].description).toBe("");
    expect(demo.reference).toBe("RGAA 7.1");
    expect(demo.description).toBe("Site déployé");
  });

  it("le barème saisi sur l'évaluation prime, le contexte est repris", () => {
    const h = buildGridHandout(grid, {
      assessmentTitle: "Oral",
      moduleName: "Accessibilité",
      date: "2026-12-01",
      durationMinutes: 15,
      maxScore: 20,
    });
    expect(h.maxScore).toBe(20);
    expect(h.context).toEqual({
      assessmentTitle: "Oral",
      moduleName: "Accessibilité",
      date: "2026-12-01",
      durationMinutes: 15,
    });
    expect(h.description).toBe("Soutenance finale");
  });

  it("sans axe : pas de titres d'axe", () => {
    const h = buildGridHandout({ ...grid, axes: [], criteria: [criterion({ label: "A" })] });
    expect(h.hasAxes).toBe(false);
    expect(h.axes).toHaveLength(1);
    expect(h.maxScore).toBe(4);
  });

  it("ne contient rien d'une correction : ni note, ni commentaire", () => {
    const keys = new Set<string>();
    const walk = (value: unknown) => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) {
          keys.add(k);
          walk(v);
        }
      }
    };
    walk(buildGridHandout(grid));
    for (const forbidden of [
      "score",
      "scores",
      "grade",
      "value",
      "comment",
      "feedback",
      "autoValidated",
    ]) {
      expect(keys.has(forbidden)).toBe(false);
    }
  });
});
