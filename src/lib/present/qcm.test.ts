import { describe, expect, it } from "vitest";

import {
  buildQcmGroups,
  choiceLetter,
  groupSummary,
  isProjectableQuestion,
  numericAnswerLabel,
  parseQcmLimit,
  qcmLimitParam,
  qcmTotal,
  withQcmLimit,
  questionTypeLabel,
  type QcmChoice,
  type QcmQuestion,
} from "./qcm";

const choice = (i: number, isCorrect: boolean): QcmChoice => ({
  id: `c${i}`,
  position: i,
  text: `Choix ${i}`,
  isCorrect,
  fraction: isCorrect ? 1 : 0,
  feedback: "",
});

const question = (id: string, over: Partial<QcmQuestion> = {}): QcmQuestion => ({
  id,
  name: id,
  type: "single_choice",
  statement: "Énoncé ?",
  generalFeedback: "",
  category: "Mini-QCM Scrum",
  archived: false,
  numericValue: null,
  numericTolerance: null,
  choices: [choice(0, false), choice(1, true), choice(2, false)],
  ...over,
});

describe("volume de questions", () => {
  it("lit le réglage de l'adresse, 5 par défaut", () => {
    expect(parseQcmLimit(undefined)).toBe(5);
    expect(parseQcmLimit("8")).toBe(8);
    expect(parseQcmLimit("all")).toBeNull();
    expect(parseQcmLimit("0")).toBe(5);
    expect(parseQcmLimit("-3")).toBe(5);
    expect(parseQcmLimit("999")).toBe(5);
    expect(parseQcmLimit("abc")).toBe(5);
    expect(parseQcmLimit(["3", "8"])).toBe(3);
  });

  it("n'écrit dans l'adresse que ce qui change du défaut", () => {
    expect(qcmLimitParam(5)).toBeNull();
    expect(qcmLimitParam(3)).toBe("qcm=3");
    expect(qcmLimitParam(null)).toBe("qcm=all");
  });
});

describe("liens des fenêtres", () => {
  it("ajoute le réglage au bon endroit de l'adresse", () => {
    expect(withQcmLimit("/x", 5)).toBe("/x");
    expect(withQcmLimit("/x", 3)).toBe("/x?qcm=3");
    expect(withQcmLimit("/x?hide=a", null)).toBe("/x?hide=a&qcm=all");
  });
});

describe("questions projetables", () => {
  it("écarte ouvertes, archivées, banque SCRUM et questions sans bonne réponse", () => {
    expect(isProjectableQuestion(question("a"))).toBe(true);
    expect(isProjectableQuestion(question("a", { type: "open" }))).toBe(false);
    expect(isProjectableQuestion(question("a", { archived: true }))).toBe(false);
    expect(isProjectableQuestion(question("a", { category: " SCRUM " }))).toBe(false);
    expect(isProjectableQuestion(question("a", { statement: "  " }))).toBe(false);
    expect(
      isProjectableQuestion(question("a", { choices: [choice(0, false), choice(1, false)] })),
    ).toBe(false);
    expect(isProjectableQuestion(question("a", { choices: [choice(0, true)] }))).toBe(false);
  });

  it("une question numérique demande une valeur, pas de choix", () => {
    const base = { type: "numerical" as const, choices: [] };
    expect(isProjectableQuestion(question("n", { ...base, numericValue: 13 }))).toBe(true);
    expect(isProjectableQuestion(question("n", { ...base, numericValue: 0 }))).toBe(true);
    expect(isProjectableQuestion(question("n", base))).toBe(false);
  });
});

describe("buildQcmGroups", () => {
  const resources = [
    { id: "r1", title: "Focus sur SCRUM" },
    { id: "r2", title: "Estimation" },
    { id: "r3", title: "Kanban" },
  ];
  const qs = new Map<string, QcmQuestion>(
    [
      question("Q10"),
      question("Q2"),
      question("Q1"),
      question("open", { type: "open" }),
      question("bank", { category: "SCRUM" }),
      question("shared"),
    ].map((q) => [q.id, q]),
  );
  const links = [
    { resourceId: "r1", questionId: "Q10" },
    { resourceId: "r1", questionId: "Q2" },
    { resourceId: "r1", questionId: "Q1" },
    { resourceId: "r1", questionId: "open" },
    { resourceId: "r1", questionId: "bank" },
    { resourceId: "r1", questionId: "shared" },
    { resourceId: "r2", questionId: "shared" },
    { resourceId: "r2", questionId: "unknown" },
  ];

  it("regroupe par fiche, ordre naturel des noms, sans ouvertes ni banque SCRUM", () => {
    const groups = buildQcmGroups({ resources, links, questions: qs, limit: null });
    expect(groups.map((g) => g.title)).toEqual(["Focus sur SCRUM"]);
    expect(groups[0].shown.map((q) => q.id)).toEqual(["Q1", "Q2", "Q10", "shared"]);
    expect(groups[0].key).toBe("qcm:r1");
  });

  it("une question liée à deux fiches ne se projette qu'une fois, sous la première", () => {
    const groups = buildQcmGroups({ resources, links, questions: qs, limit: null });
    expect(groups.flatMap((g) => g.shown).filter((q) => q.id === "shared")).toHaveLength(1);
    // La fiche « Estimation » n'a plus rien à projeter : pas de groupe vide.
    expect(groups.some((g) => g.resourceId === "r2")).toBe(false);
  });

  it("applique la limite par fiche et garde le total disponible", () => {
    const [g] = buildQcmGroups({ resources, links, questions: qs, limit: 3 });
    expect(g.shown.map((q) => q.id)).toEqual(["Q1", "Q2", "Q10"]);
    expect(g.available).toBe(4);
    expect(groupSummary(g)).toBe("3 questions sur 4");
    expect(qcmTotal([g])).toBe(3);
  });

  it("une fiche « Pour moi » n'a pas de groupe", () => {
    const groups = buildQcmGroups({
      resources,
      links,
      questions: qs,
      limit: null,
      hidden: new Set(["qcm:r1"]),
    });
    expect(groups).toEqual([]);
  });

  it("ne trie jamais les choix : l'ordre de la base est voulu", () => {
    const [g] = buildQcmGroups({ resources, links, questions: qs, limit: 1 });
    expect(g.shown[0].choices.map((c) => c.id)).toEqual(["c0", "c1", "c2"]);
  });

  it("sans lien ni ressource, aucun groupe", () => {
    expect(buildQcmGroups({ resources: [], links: [], questions: qs, limit: 5 })).toEqual([]);
    expect(buildQcmGroups({ resources, links: [], questions: qs, limit: 5 })).toEqual([]);
  });
});

describe("étiquettes", () => {
  it("type de question, lettres, réponse numérique, pluriel", () => {
    expect(questionTypeLabel(question("a"))).toBe("Une seule réponse");
    expect(questionTypeLabel(question("a", { type: "multiple_choice" }))).toBe(
      "Plusieurs réponses possibles",
    );
    expect(questionTypeLabel(question("a", { type: "true_false" }))).toBe("Vrai ou faux");
    expect(choiceLetter(0)).toBe("A");
    expect(choiceLetter(3)).toBe("D");
    expect(numericAnswerLabel(13, null)).toBe("13");
    expect(numericAnswerLabel(13, 0)).toBe("13");
    expect(numericAnswerLabel(2.5, 0.5)).toMatch(/^2,5 \(à ± 0,5 près\)$/);
    expect(groupSummary({ available: 1, shown: [question("a")] })).toBe("1 question");
  });
});
