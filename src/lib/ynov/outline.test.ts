import { describe, expect, it } from "vitest";

import { buildOutlineContent } from "./outline";

const base = {
  teacherName: "Marie Gautron",
  module: {
    name: "Méthodologies Agile & Scrum",
    ycode: "A2627_4752",
    level: "Mastère 1 Informatique",
    year: 2026,
    total_hours: 21,
    hours_lecture: 10,
    hours_td: 11,
    hours_tp: null,
    school: { name: "YNOV Campus Nantes" },
  },
  now: new Date("2026-09-24T10:00:00Z"),
};

const course = (title: string, position: number) => ({
  title,
  type: "lecture",
  position,
  session_date: null,
  learning_objectives: ["Valeurs et principes"],
  animation_notes: null,
  assessment_notes: null,
  material: null,
});

describe("buildOutlineContent", () => {
  it("reprend l'en-tête du module et la date de génération", () => {
    const c = buildOutlineContent({ ...base, courses: [] });
    expect(c).toMatchObject({
      teacherName: "Marie Gautron",
      ycode: "A2627_4752",
      schoolName: "YNOV Campus Nantes",
      totalHours: 21,
      generatedAt: "2026-09-24T10:00:00.000Z",
    });
  });

  it("trie les séances par position et les renumérote", () => {
    const c = buildOutlineContent({
      ...base,
      courses: [course("B", 2), course("A", 1), course("C", 3)],
    });
    expect(c.sessions.map((s) => [s.number, s.title])).toEqual([
      [1, "A"],
      [2, "B"],
      [3, "C"],
    ]);
  });

  it("libellé de modalité, année scolaire déduite de la première séance", () => {
    const c = buildOutlineContent({
      ...base,
      courses: [{ ...course("A", 1), session_date: "2026-10-12" }],
    });
    expect(c.sessions[0]).toMatchObject({ typeLabel: "Cours théorique" });
    expect(c.schoolYear).toBe("2026-2027");
  });

  it("ne publie ni corrigé ni bloc privé, et dérive l'évaluation des évaluations rattachées", () => {
    const c = buildOutlineContent({
      ...base,
      courses: [
        {
          ...course("A", 1),
          id: "c1",
          animation_notes: "Atelier en binômes\n- Corrigé de l'exercice 2\n[privé]astuce[/privé]",
          assessment_notes: "Rappel : rendu du jalon 1",
        },
        { ...course("B", 2), id: "c2" },
      ],
      assessments: [
        {
          course_id: "c1",
          title: "Cadrage du produit",
          type: "Jalon",
          date: "2026-11-03",
          duration_minutes: null,
          evaluated_md: "Clarté du périmètre",
          where_to_submit: "Moodle",
        },
      ],
    });
    expect(c.sessions[0].animation).toBe("Atelier en binômes");
    expect(c.sessions[0].assessment).toContain("Cadrage du produit");
    expect(c.sessions[0].assessment).toContain("Rendu : Moodle");
    expect(c.sessions[0].assessment).not.toContain("Rappel");
    expect(c.sessions[1].assessment).toBe("Pas d’évaluation notée à cette séance.");
  });
});

describe("buildOutlineContent — horaires (US-60)", () => {
  it("reprend début et fin de chaque séance, sans les secondes de Postgres", () => {
    const c = buildOutlineContent({
      ...base,
      courses: [
        { ...course("Cadrage", 1), start_time: "10:00:00", end_time: "12:00:00" },
        course("Sans horaire", 2),
      ],
    });
    expect(c.sessions[0]).toMatchObject({ startTime: "10:00", endTime: "12:00" });
    expect(c.sessions[1]).toMatchObject({ startTime: null, endTime: null });
  });
});
