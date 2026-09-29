import { describe, expect, it } from "vitest";

import { isSectionAnchor, tabFromHash } from "./tabs";

describe("tabFromHash", () => {
  it.each([
    ["#courses", "courses"],
    ["#groups", "groups-evaluations"],
    ["#assessments", "groups-evaluations"],
    ["#billing", "admin"],
    ["#documents", "admin"],
    ["#trame", "progression"],
    ["#admin", "admin"],
    ["", "progression"],
    ["#inconnu", "progression"],
  ])("%s → %s", (hash, tab) => {
    expect(tabFromHash(hash)).toBe(tab);
  });
});

describe("isSectionAnchor", () => {
  it("distingue une section d'un onglet", () => {
    expect(isSectionAnchor("#billing")).toBe(true);
    expect(isSectionAnchor("#groups")).toBe(true);
    expect(isSectionAnchor("#courses")).toBe(false); // c'est aussi le nom de l'onglet
    expect(isSectionAnchor("#admin")).toBe(false);
    expect(isSectionAnchor("#inconnu")).toBe(false);
  });
});
