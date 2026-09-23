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
  content_last_updated_at: "2026-09-20T08:00:00Z",
  resources: [{ title: "Intro Scrum" }],
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

  it("conserve la date de dernière MAJ de chaque séance, ressources et libellé de modalité", () => {
    const c = buildOutlineContent({ ...base, courses: [course("A", 1)] });
    expect(c.sessions[0]).toMatchObject({
      typeLabel: "Cours théorique",
      resources: ["Intro Scrum"],
      contentLastUpdatedAt: "2026-09-20T08:00:00Z",
    });
  });
});
