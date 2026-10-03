import { describe, expect, it } from "vitest";

import {
  examKindOf,
  individualFrame,
  parseExamKind,
  parseSubjectVersions,
  parseSubmissionMode,
} from "./exam-kind";

describe("exam-kind", () => {
  it("garde le type choisi, sinon le devine d'après le texte libre", () => {
    expect(examKindOf({ exam_kind: "oral", type: "QCM" })).toBe("oral");
    expect(examKindOf({ type: "QCM de fin de module" })).toBe("qcm");
    expect(examKindOf({ type: "Oral individuel" })).toBe("oral");
    expect(examKindOf({ type: "Contrôle écrit" })).toBe("in_class");
    expect(examKindOf({ type: null })).toBe("files");
  });
  it("refuse les valeurs inconnues", () => {
    expect(parseExamKind("bidon")).toBeNull();
    expect(parseSubjectVersions("bidon")).toBe("single");
    expect(parseSubmissionMode("bidon")).toBeNull();
    expect(parseSubmissionMode("app")).toBe("app");
  });
  it("préremplit le cadre d'après l'épreuve et la séance", () => {
    const frame = individualFrame({
      kind: "files",
      mode: "manual",
      courseNumber: 6,
      date: null,
      deliverable: null,
      evaluated: null,
      maxScore: 20,
      coefficient: 3,
    });
    expect(frame.map((l) => l.label)).toEqual([
      "Quoi",
      "Quand",
      "Où",
      "Avec qui",
      "À rendre",
      "Comment c’est noté",
    ]);
    expect(frame[1].text).toBe("À rendre pour la séance 6.");
    expect(frame[5].text).toContain("coefficient ×3");
    expect(
      individualFrame({
        kind: "qcm",
        mode: null,
        courseNumber: null,
        date: null,
        deliverable: null,
        evaluated: null,
        maxScore: 20,
        coefficient: 3,
      })[1].filled,
    ).toBe(false);
  });
});
