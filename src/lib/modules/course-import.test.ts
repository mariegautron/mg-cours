import { describe, expect, it } from "vitest";

import {
  describeImportedContent,
  describeImportPlan,
  planCourseImport,
  type ImportableCourse,
} from "./course-import";

const course = (id: string, position: number, extra: Partial<ImportableCourse> = {}) => ({
  id,
  title: `Séance ${id}`,
  type: "workshop" as const,
  position,
  learning_objectives: ["Objectif"],
  animation_notes: "Animer",
  assessment_notes: null,
  material: "Ordinateur",
  resourceLinks: [{ resource_id: `r-${id}`, role: "primary" as const }],
  ...extra,
});

describe("planCourseImport", () => {
  const source = [course("b", 2), course("a", 1), course("c", 3)];

  it("garde les séances cochées, dans l'ordre du module source, à la suite de l'existant", () => {
    const rows = planCourseImport(source, ["c", "a"], [1, 2, 3, 4]);
    expect(rows.map((r) => [r.title, r.position])).toEqual([
      ["Séance a", 5],
      ["Séance c", 6],
    ]);
  });

  it("reprend titre, modalité, objectifs, notes et liens ressources", () => {
    const [row] = planCourseImport(source, ["a"], []);
    expect(row).toMatchObject({
      title: "Séance a",
      type: "workshop",
      position: 1,
      learning_objectives: ["Objectif"],
      animation_notes: "Animer",
      material: "Ordinateur",
      resourceLinks: [{ resource_id: "r-a", role: "primary" }],
    });
  });

  it("ne reprend ni dates, ni horaires, ni statut, ni carnet, et repart « à préparer »", () => {
    const withExtras = {
      ...course("a", 1),
      session_date: "2026-10-12",
      start_time: "09:00:00",
      end_time: "12:00:00",
      prep_status: "ready",
      completion: "done",
      next_time: "à faire",
      retro_note: "privé",
    };
    const [row] = planCourseImport([withExtras], ["a"], []);
    expect(Object.keys(row).sort()).toEqual(
      [
        "animation_notes",
        "assessment_notes",
        "learning_objectives",
        "material",
        "position",
        "prep_status",
        "resourceLinks",
        "title",
        "type",
      ].sort(),
    );
    expect(row.prep_status).toBe("todo");
  });

  it("copie les tableaux (pas de partage de référence) et gère une sélection vide", () => {
    const [row] = planCourseImport(source, ["a"], []);
    expect(row.learning_objectives).not.toBe(source[1].learning_objectives);
    expect(planCourseImport(source, [], [])).toEqual([]);
  });
});

describe("describeImportedContent", () => {
  it("résume le contenu repris", () => {
    expect(describeImportedContent(course("a", 1))).toBe("1 objectif · notes · 1 ressource");
    expect(
      describeImportedContent(
        course("a", 1, {
          learning_objectives: [],
          animation_notes: null,
          material: "  ",
          resourceLinks: [],
        }),
      ),
    ).toBe("titre et modalité seulement");
  });
});

describe("describeImportPlan", () => {
  it("annonce le nombre et les numéros", () => {
    expect(describeImportPlan(0, 2)).toBe("Cochez au moins une séance à importer.");
    expect(describeImportPlan(1, 0)).toBe("1 séance sera ajoutée (séance 1).");
    expect(describeImportPlan(3, 4)).toBe(
      "3 séances seront ajoutées à la suite des 4 existantes (séances 5 à 7).",
    );
  });
});
