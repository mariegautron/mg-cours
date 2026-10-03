import { describe, expect, it } from "vitest";

import { parseHidden, plannedSections, serializeHidden, withHidden } from "./plan";
import { prepItems, projectedCount } from "./items";

describe("éléments cachés dans l'adresse", () => {
  it("aller-retour, valeurs étranges ignorées", () => {
    const keys = ["resource:abc", "subject:Jalon 1, rendu", "opening:resume"];
    const hide = serializeHidden(keys);
    expect(parseHidden(hide)).toEqual(new Set(keys));
    expect(parseHidden(undefined)).toEqual(new Set());
    expect(parseHidden(["a,b", "c"])).toEqual(new Set(["a", "b", "c"]));
    expect(parseHidden("%E0%A4%A")).toEqual(new Set());
    expect(withHidden("/x", [])).toBe("/x");
    expect(withHidden("/x", ["a"])).toBe("/x?hide=a");
  });

  it("les sections cachées ne sont plus prévues", () => {
    const planned = plannedSections(
      [{ id: "r1", title: "Cours" }],
      [{ title: "Jalon", hasCadre: true, hasGrid: true }],
      new Set(["cadre:Jalon"]),
    );
    expect(planned.map((p) => p.key)).toEqual(["resource:r1", "subject:Jalon", "grid:Jalon"]);
  });
});

describe("prepItems", () => {
  const items = prepItems({
    hasResume: true,
    objectives: 2,
    resources: [
      { id: "c", title: "Cours : Backlog", audience: "students", status: "ready", linkOnly: false },
      { id: "k", title: "Quiz Kahoot", audience: "students", status: "ready", linkOnly: true },
      { id: "a", title: "Atelier", audience: "students", status: "progress", linkOnly: false },
      { id: "t", title: "Corrigé du jalon", audience: "teacher", status: "ready", linkOnly: false },
    ],
    subjects: [{ title: "Jalon 1", hasCadre: true, hasGrid: true }],
    unpreparedSubjects: ["Oral"],
  });

  it("projetables d'abord, puis ce qui ne se projette jamais", () => {
    expect(items.map((i) => [i.key, i.mode])).toEqual([
      ["opening:resume", "toggle"],
      ["opening:objectives", "toggle"],
      ["resource:c", "toggle"],
      ["resource:k", "toggle"],
      ["subject:Jalon 1", "toggle"],
      ["cadre:Jalon 1", "toggle"],
      ["grid:Jalon 1", "toggle"],
      ["unprepared:Oral", "locked"],
      ["resource:a", "locked"],
      ["resource:t", "locked"],
    ]);
    expect(items.find((i) => i.key === "resource:t")?.lockLabel).toBe("Jamais projeté");
    expect(items.find((i) => i.key === "resource:a")?.lockLabel).toBe("Non projeté");
    expect(items.find((i) => i.key === "resource:k")?.badge?.label).toBe("Lien");
    expect(items.find((i) => i.key === "cadre:Jalon 1")?.previewKey).toBe("cadre");
  });

  it("compte ce qui sera projeté", () => {
    expect(projectedCount(items, new Set())).toBe(7);
    expect(projectedCount(items, new Set(["cadre:Jalon 1", "opening:resume"]))).toBe(5);
  });
});
