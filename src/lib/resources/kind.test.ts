import { describe, expect, it } from "vitest";

import {
  groupByCategory,
  groupByKind,
  studentFacing,
  subjectSuggestions,
  type ResourceKind,
} from "./kind";

describe("studentFacing", () => {
  it("écarte toute ressource réservée à l'enseignante", () => {
    const out = studentFacing([
      { id: "a", audience: "students" as const },
      { id: "b", audience: "teacher" as const },
      { id: "c", audience: "students" as const },
    ]);
    expect(out.map((r) => r.id)).toEqual(["a", "c"]);
  });
});

describe("groupByKind", () => {
  const r = (id: string, kind: ResourceKind | null) => ({ id, kind });

  it("suit l'ordre des types et met les non classées à la fin", () => {
    const groups = groupByKind([
      r("1", "answer_key"),
      r("2", null),
      r("3", "course"),
      r("4", "workshop"),
      r("5", "course"),
    ]);
    expect(groups.map((g) => g.label)).toEqual(["Cours", "Ateliers", "Corrigés", "Non classées"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["3", "5"]);
  });

  it("n'affiche pas de groupe vide", () => {
    expect(groupByKind([])).toEqual([]);
  });
});

describe("groupByCategory", () => {
  it("trie les matières et range les ressources sans matière à la fin", () => {
    const groups = groupByCategory([
      { id: "1", category: "Gestion de projet" },
      { id: "2", category: null },
      { id: "3", category: "Accessibilité" },
      { id: "4", category: " " },
      { id: "5", category: "Accessibilité" },
    ]);
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ["Accessibilité", ["3", "5"]],
      ["Gestion de projet", ["1"]],
      ["Sans matière", ["2", "4"]],
    ]);
  });
});

describe("subjectSuggestions", () => {
  it("fusionne matières proposées et utilisées sans doublon (casse ignorée)", () => {
    const out = subjectSuggestions(["agilité", "UX design", " "]);
    expect(out).toContain("UX design");
    expect(out.filter((s) => s.toLowerCase() === "agilité")).toHaveLength(1);
    expect(out).toEqual([...out].sort((a, b) => a.localeCompare(b, "fr")));
  });
});
