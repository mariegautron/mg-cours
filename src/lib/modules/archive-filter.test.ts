import { describe, expect, it } from "vitest";

import { parseModuleFilter, splitModules } from "./archive-filter";

describe("parseModuleFilter", () => {
  it("vaut « active » par défaut ou pour une valeur inconnue", () => {
    expect(parseModuleFilter({})).toBe("active");
    expect(parseModuleFilter({ filter: "nope" })).toBe("active");
  });

  it("lit archived / all", () => {
    expect(parseModuleFilter({ filter: "archived" })).toBe("archived");
    expect(parseModuleFilter({ filter: ["all", "archived"] })).toBe("all");
  });

  it("convertit l'ancien ?archived=1 en « all »", () => {
    expect(parseModuleFilter({ archived: "1" })).toBe("all");
  });
});

describe("splitModules", () => {
  it("garde l'ordre des actifs et trie les archivés du plus récent au plus ancien", () => {
    const modules = [
      { id: "a", archived_at: null },
      { id: "old", archived_at: "2025-07-01T10:00:00Z" },
      { id: "b", archived_at: null },
      { id: "new", archived_at: "2026-07-01T10:00:00Z" },
    ];
    const { active, archived } = splitModules(modules);
    expect(active.map((m) => m.id)).toEqual(["a", "b"]);
    expect(archived.map((m) => m.id)).toEqual(["new", "old"]);
  });
});
