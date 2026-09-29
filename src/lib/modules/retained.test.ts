import { describe, expect, it } from "vitest";

import { splitRetained } from "./retained";

describe("splitRetained", () => {
  const list = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("sépare les ressources retenues des autres en gardant l'ordre", () => {
    const { retained, others } = splitRetained(list, new Set(["c", "a"]));
    expect(retained.map((r) => r.id)).toEqual(["a", "c"]);
    expect(others.map((r) => r.id)).toEqual(["b"]);
  });

  it("ne retient rien sans identifiant, ignore les identifiants inconnus", () => {
    expect(splitRetained(list, new Set()).retained).toEqual([]);
    expect(splitRetained(list, new Set(["zzz"])).others).toHaveLength(3);
  });
});
