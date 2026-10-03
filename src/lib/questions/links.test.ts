import { describe, expect, it } from "vitest";

import {
  diffLinks,
  keepKnown,
  linkedQuestionsTitle,
  originLabel,
  resourcesByQuestion,
} from "./links";

describe("liens question ↔ ressource", () => {
  it("écart de sélection : ajouts et retraits", () => {
    expect(diffLinks(["a", "b"], ["b", "c", "c"])).toEqual({ add: ["c"], remove: ["a"] });
    expect(diffLinks([], [])).toEqual({ add: [], remove: [] });
    expect(diffLinks(["a"], ["a"])).toEqual({ add: [], remove: [] });
  });
  it("ne garde que les identifiants connus, sans doublon", () => {
    expect(keepKnown(["a", "x", "a", "b"], new Set(["a", "b"]))).toEqual(["a", "b"]);
  });
  it("étiquettes", () => {
    expect(linkedQuestionsTitle(0)).toBe("Questions liées (0)");
    expect(originLabel([])).toBe("");
    expect(originLabel(["Agile"])).toBe("Ressource d’origine : Agile");
    expect(originLabel(["Agile", "Scrum"])).toBe("Ressources d’origine : Agile, Scrum");
  });
  it("index par question, triés, ressources inconnues ignorées", () => {
    const titles = new Map([
      ["r1", "Scrum"],
      ["r2", "Agile"],
    ]);
    const m = resourcesByQuestion(
      [
        { resourceId: "r1", questionId: "q1" },
        { resourceId: "r2", questionId: "q1" },
        { resourceId: "r1", questionId: "q1" },
        { resourceId: "zz", questionId: "q2" },
      ],
      titles,
    );
    expect(m.get("q1")?.map((r) => r.title)).toEqual(["Agile", "Scrum"]);
    expect(m.has("q2")).toBe(false);
  });
});
