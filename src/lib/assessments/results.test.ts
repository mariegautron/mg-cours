import { describe, expect, it } from "vitest";

import { buildResultSheets } from "./results";
import type { Tables } from "@/types/db";

const student = (id: string, first: string, email: string | null): Tables<"student"> =>
  ({
    id,
    first_name: first,
    last_name: "Test",
    email,
  }) as Tables<"student">;

const grade = (over: Partial<Tables<"grade">>): Tables<"grade"> =>
  ({
    id: "g",
    assessment_id: "a",
    student_id: null,
    student_group_id: null,
    is_group_grade: false,
    value: 8,
    scores: { c1: 3, c2: 5 },
    feedback: "Bien",
    predefined_comment_ids: ["k1", "inconnu"],
    ...over,
  }) as Tables<"grade">;

const base = {
  moduleName: "Agile",
  criteria: [
    { id: "c1", label: "Présentation", weight: 4 },
    { id: "c2", label: "Contenu", weight: 6 },
  ],
  comments: [{ id: "k1", text: "Bonne maîtrise." }],
  groups: [
    {
      id: "grp",
      name: "G1",
      members: [student("s1", "Lea", "lea@x.fr"), student("s2", "Noa", null)],
    },
  ],
};

describe("buildResultSheets", () => {
  it("note individuelle : une fiche par étudiant·e noté·e, détail par critère et commentaires connus", () => {
    const sheets = buildResultSheets({
      ...base,
      assessment: {
        title: "Oral",
        subject: null,
        date: null,
        is_group_grade: false,
        max_score: null,
      },
      grades: [grade({ student_id: "s1" })],
    });
    expect(sheets).toHaveLength(1);
    expect(sheets[0].recipients).toEqual([{ name: "Lea Test", email: "lea@x.fr" }]);
    expect(sheets[0].maxScore).toBe(10);
    expect(sheets[0].valueOn20).toBe(16);
    expect(sheets[0].criteria).toEqual([
      { label: "Présentation", points: 3, max: 4 },
      { label: "Contenu", points: 5, max: 6 },
    ]);
    expect(sheets[0].comments).toEqual(["Bonne maîtrise."]);
  });

  it("note de groupe : une seule fiche pour tous les membres", () => {
    const sheets = buildResultSheets({
      ...base,
      assessment: {
        title: "Projet",
        subject: null,
        date: null,
        is_group_grade: true,
        max_score: null,
      },
      grades: [grade({ student_group_id: "grp", is_group_grade: true })],
    });
    expect(sheets).toHaveLength(1);
    expect(sheets[0].recipients.map((r) => r.name)).toEqual(["Lea Test", "Noa Test"]);
  });

  it("plusieurs groupes : une fiche par groupe noté, une par étudiant·e sans doublon", () => {
    const groups = [
      ...base.groups,
      { id: "grp2", name: "G2", members: [student("s2", "Noa", null), student("s3", "Zoe", null)] },
    ];
    const groupSheets = buildResultSheets({
      ...base,
      groups,
      assessment: {
        title: "Projet",
        subject: null,
        date: null,
        is_group_grade: true,
        max_score: null,
      },
      grades: [
        grade({ id: "x", student_group_id: "grp", is_group_grade: true }),
        grade({ id: "y", student_group_id: "grp2", is_group_grade: true, value: 12 }),
      ],
    });
    expect(groupSheets.map((sh) => [sh.value, sh.recipients.map((r) => r.name)])).toEqual([
      [8, ["Lea Test", "Noa Test"]],
      [12, ["Noa Test", "Zoe Test"]],
    ]);

    const individualSheets = buildResultSheets({
      ...base,
      groups,
      assessment: {
        title: "Oral",
        subject: null,
        date: null,
        is_group_grade: false,
        max_score: null,
      },
      grades: [grade({ student_id: "s2" }), grade({ student_id: "s3" })],
    });
    expect(individualSheets.map((sh) => sh.recipients[0].name)).toEqual(["Noa Test", "Zoe Test"]);
  });

  it("retient le barème saisi plutôt que le total de la grille", () => {
    const sheets = buildResultSheets({
      ...base,
      assessment: {
        title: "Oral",
        subject: null,
        date: null,
        is_group_grade: false,
        max_score: 40,
      },
      grades: [grade({ student_id: "s1", value: 30 })],
    });
    expect(sheets[0].maxScore).toBe(40);
    expect(sheets[0].valueOn20).toBe(15);
  });

  it("aucune fiche tant qu'aucune note n'est saisie", () => {
    const sheets = buildResultSheets({
      ...base,
      assessment: {
        title: "Oral",
        subject: null,
        date: null,
        is_group_grade: false,
        max_score: null,
      },
      grades: [grade({ student_id: "s1", value: null })],
    });
    expect(sheets).toEqual([]);
  });
});
