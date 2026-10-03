import { describe, expect, it } from "vitest";

import {
  buildTimeline,
  courseCellLabel,
  frameStatus,
  gridStatus,
  type TimelineAssessment,
  type TimelineCourse,
} from "./module-overview";

const courses: TimelineCourse[] = Array.from({ length: 6 }, (_, i) => ({
  id: `c${i + 1}`,
  title: i < 4 ? `Cours ${i + 1}` : `Séance ${i + 1}`,
  date: `2026-10-${12 + i}`,
  toBuild: i >= 4,
}));

const a = (over: Partial<TimelineAssessment>): TimelineAssessment => ({
  id: "a",
  title: "Évaluation",
  courseId: null,
  role: null,
  isGroupGrade: true,
  makeup: false,
  ...over,
});

describe("buildTimeline", () => {
  const rows = buildTimeline(courses, [
    a({
      id: "ind",
      title: "Individuelle",
      courseId: "c6",
      role: "individual",
      isGroupGrade: false,
    }),
    a({ id: "oral", title: "Oral", courseId: "c6", role: "oral" }),
    a({ id: "j1", title: "Jalon 1", courseId: "c3", role: "milestone" }),
    a({ id: "r", title: "Rattrapage", courseId: "c6", makeup: true }),
  ]);

  it("range jalons, oral puis individuelle, sans rattrapage", () => {
    expect(rows.map((r) => r.assessmentId)).toEqual(["j1", "oral", "ind"]);
  });

  it("jalon : lancé en séance 1, travail, rendu à la séance du rendu", () => {
    expect(rows[0].cells).toEqual([
      { col: 0, span: 1, kind: "launch", label: "Lancé : brief" },
      { col: 1, span: 1, kind: "work", label: "Travail en groupe" },
      { col: 2, span: 1, kind: "due", label: "Rendu + retours" },
    ]);
    expect(rows[0].subtitle).toBe("Projet fil rouge · groupe ×1 · séance 3");
  });

  it("oral : préparation sur deux séances puis passage ; individuelle : un rendu", () => {
    expect(rows[1].cells.map((c) => [c.col, c.span, c.kind])).toEqual([
      [3, 2, "work"],
      [5, 1, "oral"],
    ]);
    expect(rows[2].cells).toEqual([
      { col: 5, span: 1, kind: "solo", label: "Rendu de fichiers, ou QCM" },
    ]);
    expect(rows[2].subtitle).toBe(
      "Projet fil rouge · individuelle ×3 · séance 6".replace(
        "Projet fil rouge",
        "Projet fil rouge",
      ),
    );
  });

  it("une évaluation sans séance n'a pas de cellule", () => {
    const [row] = buildTimeline(courses, [a({ id: "x", title: "X" })]);
    expect(row.cells).toEqual([]);
    expect(row.dueSession).toBeNull();
    expect(row.subtitle).toContain("pas encore rattachée");
  });
});

describe("cellules de cours, cadre et grille", () => {
  it("séance à construire", () => {
    expect(courseCellLabel(courses[4])).toEqual({ text: "À construire", todo: true });
    expect(courseCellLabel({ ...courses[0], toBuild: true })).toEqual({
      text: "Cours 1 à construire",
      todo: true,
    });
    expect(courseCellLabel(courses[0])).toEqual({ text: "Cours 1", todo: false });
  });

  const full = {
    objective: "o",
    subject: "s",
    deliverableMd: "d",
    evaluatedMd: "e",
    isOral: false,
    date: null,
    oralStartTime: null,
  };
  it("cadre : complet, à compléter, à écrire", () => {
    expect(frameStatus(full)).toEqual({ tone: "ok", label: "Complet" });
    expect(frameStatus({ ...full, deliverableMd: "" })).toEqual({
      tone: "build",
      label: "À compléter : rendu attendu",
    });
    expect(
      frameStatus({
        ...full,
        objective: null,
        subject: null,
        deliverableMd: null,
        evaluatedMd: null,
      }),
    ).toEqual({ tone: "build", label: "À écrire" });
    expect(frameStatus({ ...full, isOral: true }).label).toBe("À compléter : date, heure");
  });
  it("grille", () => {
    expect(gridStatus("Grille d'oral")).toEqual({ tone: "ok", label: "Grille d'oral" });
    expect(gridStatus(null)).toEqual({ tone: "warn", label: "À créer" });
  });
});
