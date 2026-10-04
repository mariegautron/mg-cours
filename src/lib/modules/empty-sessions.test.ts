import { describe, expect, it } from "vitest";

import { emptyUndatedSessions, type EmptySessionContext } from "./empty-sessions";
import type { CourseWithResources } from "./queries";

const course = (over: Partial<CourseWithResources> & { id: string }): CourseWithResources =>
  ({
    title: "Introduction à l'Agilité: - Valeurs et principes",
    position: 1,
    session_date: null,
    start_time: null,
    end_time: null,
    prep_status: "todo",
    completion: null,
    learning_objectives: ["Valeurs et principes"],
    animation_notes: null,
    assessment_notes: null,
    material: null,
    not_covered: null,
    next_time: null,
    retro_note: null,
    slides_url: null,
    slides: [],
    resources: [],
    ...over,
  }) as unknown as CourseWithResources;

const none: EmptySessionContext = {
  plans: new Map(),
  assessmentCourseIds: new Set(),
  expectationCourseIds: new Set(),
};

describe("séances vides sans date", () => {
  it("retient une séance sans date, à préparer, sans rien (même titré d'un texte d'attendu)", () => {
    expect(emptyUndatedSessions([course({ id: "a" })], none).map((c) => c.id)).toEqual(["a"]);
  });

  it("épargne toute séance datée, préparée, ou avec du contenu", () => {
    const list = [
      course({ id: "date", session_date: "2026-10-12" }),
      course({ id: "ready", prep_status: "ready" }),
      course({ id: "notes", animation_notes: "Tour de table" }),
      course({ id: "slides", slides_url: "https://figma.com/x" }),
      course({ id: "res", resources: [{ id: "r" }] as never }),
      course({ id: "plan" }),
      course({ id: "eval" }),
      course({ id: "exp" }),
      course({ id: "done", completion: "done" as never }),
    ];
    const ctx: EmptySessionContext = {
      plans: new Map([["plan", { deliverable: "Un backlog", resourceOrder: [] }]]),
      assessmentCourseIds: new Set(["eval"]),
      expectationCourseIds: new Set(["exp"]),
    };
    expect(emptyUndatedSessions(list, ctx)).toEqual([]);
  });
});
