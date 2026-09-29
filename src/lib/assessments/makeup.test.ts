import { describe, expect, it } from "vitest";

import type { Tables } from "@/types/db";

import {
  excusedStudentIds,
  makeupBlocker,
  makeupInvariants,
  makeupTitle,
  missingTargets,
  planMakeup,
} from "./makeup";

const original = {
  id: "a1",
  module_id: "m1",
  title: "Évaluation individuelle",
  type: "Individuelle",
  coefficient: 3,
  subject: "Corrige ce code.",
  objective: "Objectif",
  deliverable_md: null,
  evaluated_md: null,
  duration_minutes: 45,
  max_score: null,
  is_group_grade: false,
  grading_grid_id: "g1",
  auto_validated_criterion_ids: ["c1"],
  course_id: "cs1",
  project_id: "p1",
  project_role: "individual",
  project_position: 3,
  prep_status: "provided",
  date: "2026-10-12",
  experience_note: "privé",
  makeup_of_id: null,
} as unknown as Tables<"assessment">;

describe("excusedStudentIds", () => {
  it("ne garde que les absent·es excusé·es, sans doublon", () => {
    expect(
      excusedStudentIds([
        { student_id: "s1", attendance: "absent_excused" },
        { student_id: "s2", attendance: "absent_unexcused" },
        { student_id: "s3", attendance: "present" },
        { student_id: "s1", attendance: "absent_excused" },
        { student_id: null, attendance: "absent_excused" },
      ]),
    ).toEqual(["s1"]);
  });
});

describe("makeupBlocker", () => {
  it("autorise un sujet individuel avec au moins un·e absent·e excusé·e", () => {
    expect(makeupBlocker(original, 1)).toBeNull();
  });

  it("refuse une note de groupe", () => {
    expect(makeupBlocker({ ...original, is_group_grade: true }, 2)).toMatch(/sujets individuels/);
  });

  it("refuse sans absent·e excusé·e", () => {
    expect(makeupBlocker(original, 0)).toMatch(/rien à rattraper/);
  });

  it("refuse le rattrapage d'un rattrapage", () => {
    expect(makeupBlocker({ ...original, makeup_of_id: "x" }, 1)).toMatch(/déjà un rattrapage/);
  });
});

describe("planMakeup", () => {
  const plan = planMakeup(original);

  it("garde grille, coefficient, barème et sujet ; titre préfixé ; lien vers l'original", () => {
    expect(plan).toMatchObject({
      module_id: "m1",
      title: "Rattrapage — Évaluation individuelle",
      makeup_of_id: "a1",
      coefficient: 3,
      grading_grid_id: "g1",
      max_score: null,
      is_group_grade: false,
      subject: "Corrige ce code.",
      duration_minutes: 45,
    });
  });

  it("repart en brouillon « à construire », sans date, séance, projet ni retour d'expérience", () => {
    const row = plan as Record<string, unknown>;
    expect(plan.prep_status).toBe("to_build");
    expect(plan.course_id).toBeNull();
    expect(plan.project_id).toBeNull();
    expect(plan.project_role).toBeNull();
    expect(row.date).toBeUndefined();
    expect(row.experience_note).toBeUndefined();
  });
});

describe("makeupInvariants", () => {
  it("impose grille, coefficient, barème et note individuelle de l'original", () => {
    expect(makeupInvariants({ ...original, coefficient: 3, max_score: 20 })).toEqual({
      grading_grid_id: "g1",
      coefficient: 3,
      max_score: 20,
      auto_validated_criterion_ids: ["c1"],
      is_group_grade: false,
    });
  });
});

describe("missingTargets", () => {
  it("renvoie les absent·es excusé·es pas encore inscrit·es", () => {
    expect(missingTargets(["s1", "s2", "s3"], ["s2"])).toEqual(["s1", "s3"]);
  });
});

describe("makeupTitle", () => {
  it("préfixe le titre", () => {
    expect(makeupTitle("Oral")).toBe("Rattrapage — Oral");
  });
});
