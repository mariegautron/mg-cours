import { describe, expect, it } from "vitest";

import type { Tables } from "@/types/db";

import {
  COPIED_LABELS,
  NOT_COPIED_LABELS,
  planProjectReuse,
  reusableLabel,
  type ReuseSource,
} from "./reuse";

const assessment = (over: Partial<Tables<"assessment">>): Tables<"assessment"> =>
  ({
    id: "a1",
    owner_id: "o",
    module_id: "old",
    title: "Jalon 1",
    type: "projet",
    coefficient: 1,
    subject: "Sujet SantaConnect",
    objective: "Obj",
    deliverable_md: "Livrable",
    evaluated_md: "Évalué",
    duration_minutes: null,
    max_score: 20,
    is_group_grade: true,
    grading_grid_id: "grid1",
    auto_validated_criterion_ids: [],
    course_id: "c-old",
    date: "2026-10-12",
    oral_start_time: "09:00",
    results_sent_at: "2026-11-01T00:00:00Z",
    experience_note: "Note privée",
    files: [{ path: "x" }],
    project_id: "p-old",
    project_role: "milestone",
    project_position: 1,
    prep_status: "provided",
    makeup_of_id: null,
    created_at: "",
    updated_at: "",
    ...over,
  }) as unknown as Tables<"assessment">;

const source: ReuseSource = {
  title: "SantaConnect",
  brief_md: "## Contexte\n\nTexte",
  assessments: [
    assessment({ id: "a2", title: "Oral", project_role: "oral", project_position: 2 }),
    assessment({}),
    assessment({
      id: "a3",
      title: "Hors projet",
      project_id: null,
      project_role: null,
      project_position: null,
    }),
    assessment({ id: "a4", title: "Rattrapage", makeup_of_id: "a1" }),
  ],
  themes: [{ title: "Thème A", description_md: "desc" }],
};

describe("planProjectReuse", () => {
  const plan = planProjectReuse(source, { moduleId: "new", projectId: "p-new", keepThemes: false });

  it("copie le cadre : titre, brief, évaluations du projet dans l'ordre, grille conservée", () => {
    expect(plan.project.title).toBe("SantaConnect");
    expect(plan.project.brief_md).toBe("## Contexte\n\nTexte");
    expect(plan.assessments.map((a) => a.title)).toEqual(["Jalon 1", "Oral"]);
    expect(
      plan.assessments.every((a) => a.grading_grid_id === "grid1" && a.module_id === "new"),
    ).toBe(true);
    expect(plan.assessments.every((a) => a.project_id === "p-new")).toBe(true);
  });
  it("ne copie jamais dates, séances, résultats, retours, fichiers ni statut « fourni »", () => {
    for (const a of plan.assessments) {
      expect(a.course_id).toBeNull();
      for (const forbidden of [
        "date",
        "oral_start_time",
        "results_sent_at",
        "experience_note",
        "files",
        "id",
        "owner_id",
      ]) {
        expect(forbidden in a).toBe(false);
      }
      expect(a.prep_status).toBe("to_build");
    }
  });
  it("contexte client vidé et signalé à réécrire ; thèmes seulement sur demande", () => {
    expect(plan.project.client_context_md).toBe("");
    expect(plan.toRewrite).toContain("Contexte client");
    expect(plan.themes).toEqual([]);
    const withThemes = planProjectReuse(source, {
      moduleId: "new",
      projectId: "p-new",
      keepThemes: true,
    });
    expect(withThemes.themes).toEqual([{ title: "Thème A", description_md: "desc" }]);
  });
  it("libellés de ce qui est copié ou non, jamais de notes ni de groupes dans la liste copiée", () => {
    expect(COPIED_LABELS.join(" ")).not.toMatch(/notes|groupes|rendus/i);
    expect(NOT_COPIED_LABELS.join(" ")).toMatch(/notes/);
    expect(NOT_COPIED_LABELS.join(" ")).toMatch(/groupes/);
    expect(NOT_COPIED_LABELS.join(" ")).toMatch(/rendus/);
  });
  it("libellé de choix", () => {
    expect(reusableLabel({ moduleName: "Agile", year: 2025, title: "Refonte" })).toBe(
      "Agile (2025) : Refonte",
    );
  });
});
