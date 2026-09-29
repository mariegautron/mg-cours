import { describe, expect, it } from "vitest";

import { filterQuestions, readQuestionFilters } from "./filter";
import type { QuestionInput } from "./types";
import { fractionsFromChecks, normalizeChoices, parseTags, validateQuestion } from "./validate";

const base: QuestionInput = {
  category: "Scrum",
  name: "Q1",
  type: "single_choice",
  statement: "Énoncé ?",
  generalFeedback: "",
  defaultPoints: 1,
  tags: [],
  choices: [
    { text: "A", fraction: 1, feedback: "" },
    { text: "B", fraction: 0, feedback: "" },
  ],
  numericValue: null,
  numericTolerance: null,
};

describe("validateQuestion", () => {
  it("accepte une question valide de chaque type", () => {
    expect(validateQuestion(base)).toEqual([]);
    expect(
      validateQuestion({
        ...base,
        type: "multiple_choice",
        choices: [
          { text: "A", fraction: 0.5, feedback: "" },
          { text: "B", fraction: 0.5, feedback: "" },
        ],
      }),
    ).toEqual([]);
    expect(validateQuestion({ ...base, type: "open", choices: [] })).toEqual([]);
    expect(
      validateQuestion({
        ...base,
        type: "numerical",
        choices: [],
        numericValue: 3,
        numericTolerance: 0.1,
      }),
    ).toEqual([]);
    expect(
      validateQuestion({
        ...base,
        type: "true_false",
        choices: [{ text: "", fraction: 1, feedback: "" }],
      }),
    ).toEqual([]);
  });

  it("dit ce qui manque, en tutoyant", () => {
    const errors = validateQuestion({
      ...base,
      name: " ",
      statement: "",
      choices: [{ text: "A", fraction: 0, feedback: "" }],
    });
    expect(errors).toContain("Donne un nom court à la question (ex. SCRUM03_Roles).");
    expect(errors).toContain("L’énoncé est vide : écris la question posée.");
    expect(errors).toContain("Ajoute au moins deux choix.");
    expect(errors.join(" ")).not.toMatch(/\bvous\b|\bvotre\b/i);
  });

  it("choix unique : exactement une bonne réponse", () => {
    const two = base.choices.map((c) => ({ ...c, fraction: 1 }));
    expect(validateQuestion({ ...base, choices: two })[0]).toMatch(/exactement une bonne réponse/);
    expect(
      validateQuestion({ ...base, choices: base.choices.map((c) => ({ ...c, fraction: 0 })) })[0],
    ).toMatch(/exactement une bonne réponse/);
  });

  it("numérique : valeur obligatoire, tolérance positive", () => {
    expect(validateQuestion({ ...base, type: "numerical", choices: [] })[0]).toMatch(
      /valeur attendue/,
    );
    expect(
      validateQuestion({
        ...base,
        type: "numerical",
        choices: [],
        numericValue: 1,
        numericTolerance: -1,
      })[0],
    ).toMatch(/tolérance/);
  });

  it("un choix vide est signalé", () => {
    expect(
      validateQuestion({
        ...base,
        choices: [
          { text: "A", fraction: 1, feedback: "" },
          { text: " ", fraction: 0, feedback: "" },
        ],
      })[0],
    ).toMatch(/choix est vide/);
  });
});

describe("normalizeChoices / fractionsFromChecks", () => {
  it("vrai / faux : toujours Vrai puis Faux", () => {
    const tf = {
      ...base,
      type: "true_false" as const,
      choices: [{ text: "x", fraction: 0, feedback: "" }],
    };
    expect(normalizeChoices(tf).map((c) => [c.text, c.fraction])).toEqual([
      ["Vrai", 0],
      ["Faux", 1],
    ]);
  });

  it("répartit les points entre les bonnes réponses", () => {
    expect(fractionsFromChecks([true, false, true, true])).toEqual([0.3333, 0, 0.3333, 0.3333]);
    expect(fractionsFromChecks([false, false])).toEqual([0, 0]);
  });
});

describe("parseTags", () => {
  it("découpe, nettoie, dédoublonne sans tenir compte de la casse", () => {
    expect(parseTags("Scrum, agile ;scrum\n RGAA ,")).toEqual(["Scrum", "agile", "RGAA"]);
  });
});

describe("filterQuestions", () => {
  const qs = [
    {
      ...base,
      name: "SCRUM03",
      tags: ["Agile"],
      archived_at: null,
      general_feedback: "",
      choices: [{ text: "Le Product Owner" }],
    },
    {
      ...base,
      name: "WEB01",
      category: "Accessibilité",
      type: "open" as const,
      statement: "Explique le **RGAA**",
      tags: [],
      archived_at: null,
      general_feedback: "",
    },
    { ...base, name: "OLD", archived_at: "2026-01-01", general_feedback: "" },
  ];
  const f = (p: Record<string, string>) => readQuestionFilters(p);

  it("masque les archivées par défaut, les montre à la demande", () => {
    expect(filterQuestions(qs, f({})).map((q) => q.name)).toEqual(["SCRUM03", "WEB01"]);
    expect(filterQuestions(qs, f({ archived: "1" })).map((q) => q.name)).toEqual(["OLD"]);
  });

  it("filtre par catégorie, type, tag (sans casse)", () => {
    expect(filterQuestions(qs, f({ category: "Accessibilité" })).map((q) => q.name)).toEqual([
      "WEB01",
    ]);
    expect(filterQuestions(qs, f({ type: "open" })).map((q) => q.name)).toEqual(["WEB01"]);
    expect(filterQuestions(qs, f({ tag: "agile" })).map((q) => q.name)).toEqual(["SCRUM03"]);
    expect(f({ type: "n'importe quoi" }).type).toBe("");
  });

  it("recherche sans accent ni casse, tous les mots, dans énoncé, choix et nom", () => {
    expect(filterQuestions(qs, f({ q: "rgaa explique" })).map((q) => q.name)).toEqual(["WEB01"]);
    expect(filterQuestions(qs, f({ q: "product owner" })).map((q) => q.name)).toEqual(["SCRUM03"]);
    expect(filterQuestions(qs, f({ q: "accessibilite" })).map((q) => q.name)).toEqual(["WEB01"]);
    expect(filterQuestions(qs, f({ q: "rgaa introuvable" }))).toEqual([]);
  });
});
