import { describe, expect, it } from "vitest";

import type { Tables } from "@/types/db";

import {
  copiedFile,
  copiedFilePath,
  experienceNotes,
  planAssessmentCopy,
} from "./duplicate-evaluations";

const source = {
  id: "a1",
  owner_id: "o1",
  module_id: "m1",
  title: "Jalon 1",
  type: "Projet",
  coefficient: 2,
  subject: "Consigne",
  objective: "Objectif",
  deliverable_md: "Rendu",
  evaluated_md: "Évalué",
  duration_minutes: 45,
  max_score: 20,
  is_group_grade: true,
  grading_grid_id: "g1",
  auto_validated_criterion_ids: ["c1"],
  course_id: "cs1",
  project_id: "p1",
  project_role: "milestone",
  project_position: 2,
  prep_status: "provided",
  date: "2026-10-12",
  oral_start_time: "09:00:00",
  results_sent_at: "2026-11-01T10:00:00Z",
  experience_note: "trop long",
  files: [{ path: "o1/a1/x.zip", name: "x.zip", size: 1, mime: "application/zip" }],
  created_at: "",
  updated_at: "",
} as unknown as Tables<"assessment">;

const ctx = { moduleId: "m2", courseIds: new Map([["cs1", "cs2"]]), projectId: "p2" };

describe("planAssessmentCopy", () => {
  it("copie ce qui est propre au module et remappe séance et projet", () => {
    const row = planAssessmentCopy(source, ctx);
    expect(row).toMatchObject({
      module_id: "m2",
      title: "Jalon 1",
      coefficient: 2,
      subject: "Consigne",
      grading_grid_id: "g1",
      auto_validated_criterion_ids: ["c1"],
      course_id: "cs2",
      project_id: "p2",
      project_role: "milestone",
      project_position: 2,
      is_group_grade: true,
    });
  });

  it("ne copie ni date, ni horaire d'oral, ni envoi, ni retour d'expérience, ni fichiers", () => {
    const row = planAssessmentCopy(source, ctx) as Record<string, unknown>;
    for (const key of ["date", "oral_start_time", "results_sent_at", "experience_note", "files"]) {
      expect(row[key]).toBeUndefined();
    }
    expect(row.id).toBeUndefined();
    expect(row.owner_id).toBeUndefined();
  });

  it("un sujet fourni redevient prêt ; les autres états sont gardés", () => {
    expect(planAssessmentCopy(source, ctx).prep_status).toBe("ready");
    expect(planAssessmentCopy({ ...source, prep_status: "to_build" }, ctx).prep_status).toBe(
      "to_build",
    );
  });

  it("séance inconnue : pas de rattachement plutôt qu'une séance d'un autre module", () => {
    const row = planAssessmentCopy(source, { ...ctx, courseIds: new Map() });
    expect(row.course_id).toBeNull();
  });

  it("sans projet dans la copie, l'évaluation n'est plus rattachée", () => {
    const row = planAssessmentCopy(source, { ...ctx, projectId: null });
    expect(row.project_id).toBeNull();
  });
});

describe("copie des fichiers", () => {
  it("change le dossier de l'évaluation et garde le nom", () => {
    expect(copiedFilePath("o1/a1/snippet.html", "o1", "a2")).toBe("o1/a2/snippet.html");
  });

  it("garde nom, taille et type", () => {
    expect(
      copiedFile({ path: "o1/a1/x.zip", name: "x.zip", size: 1, mime: "application/zip" }, "o1", "a2"),
    ).toEqual({ path: "o1/a2/x.zip", name: "x.zip", size: 1, mime: "application/zip" });
  });
});

describe("experienceNotes", () => {
  it("ne garde que les évaluations avec une note non vide", () => {
    expect(
      experienceNotes([
        { title: "A", experience_note: "  à revoir  " },
        { title: "B", experience_note: "   " },
        { title: "C", experience_note: null },
      ]),
    ).toEqual([{ title: "A", text: "à revoir" }]);
  });
});
