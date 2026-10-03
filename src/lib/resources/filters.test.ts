import { describe, expect, it } from "vitest";

import { readResourceFilters } from "./filters";

describe("readResourceFilters", () => {
  it("lit type, matière, visibilité et regroupement", () => {
    const { filters, group } = readResourceFilters({
      q: " raci ",
      kind: "answer_key",
      category: "Gestion de projet",
      audience: "teacher",
      group: "category",
    });
    expect(filters).toMatchObject({
      q: "raci",
      kind: "answer_key",
      category: "Gestion de projet",
      audience: "teacher",
      archived: false,
    });
    expect(group).toBe("category");
  });

  it("accepte le filtre « non classées »", () => {
    expect(readResourceFilters({ kind: "none" }).filters.kind).toBe("none");
  });

  it("ignore les valeurs inconnues et ne regroupe pas par défaut (liste simple)", () => {
    const { filters, group } = readResourceFilters({
      kind: "slides",
      audience: "everyone",
      group: "x",
      tag: ["a", "b"],
    });
    expect(filters.kind).toBeUndefined();
    expect(filters.audience).toBeUndefined();
    expect(filters.tag).toBeUndefined();
    expect(group).toBe("none");
  });
});
