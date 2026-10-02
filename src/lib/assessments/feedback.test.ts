import { describe, expect, it } from "vitest";

import { FEEDBACK_MAX_LENGTH, parseCriterionComments, readFeedback } from "./feedback";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(entries)) data.set(k, v);
  return data;
}

describe("readFeedback", () => {
  it("lit les commentaires de critères, points forts, progrès et commentaire libre", () => {
    const fields = readFeedback(
      form({
        comment_c1: "  Bonne structure. ",
        comment_c2: "   ",
        strengths: "Code propre",
        progress: "Tester davantage",
        feedback: "Continuez ainsi.",
      }),
      ["c1", "c2"],
    );
    expect(fields).toEqual({
      criterionComments: { c1: "Bonne structure." },
      strengths: "Code propre",
      progress: "Tester davantage",
      feedback: "Continuez ainsi.",
    });
  });

  it("lit le commentaire d'un axe de la grille (sous « axis:<axe> »), jamais d'un axe inconnu", () => {
    const fields = readFeedback(
      form({
        "comment_axis:ax1": " Backlog clair. ",
        "comment_axis:intrus": "x",
        comment_c1: "ok",
      }),
      ["c1"],
      ["ax1"],
    );
    expect(fields.criterionComments).toEqual({ c1: "ok", "axis:ax1": "Backlog clair." });
  });

  it("ignore les critères qui ne sont pas dans la grille et vide les champs absents", () => {
    const fields = readFeedback(form({ comment_intrus: "x" }), ["c1"]);
    expect(fields).toEqual({
      criterionComments: {},
      strengths: null,
      progress: null,
      feedback: null,
    });
  });

  it("tronque un commentaire trop long", () => {
    const fields = readFeedback(form({ feedback: "a".repeat(FEEDBACK_MAX_LENGTH + 50) }), []);
    expect(fields.feedback).toHaveLength(FEEDBACK_MAX_LENGTH);
  });
});

describe("parseCriterionComments", () => {
  it("garde les textes non vides et ignore le reste", () => {
    expect(parseCriterionComments({ a: "ok", b: "  ", c: 3, d: null })).toEqual({ a: "ok" });
    expect(parseCriterionComments(null)).toEqual({});
    expect(parseCriterionComments(["x"])).toEqual({});
    expect(parseCriterionComments("texte")).toEqual({});
  });
});
