import { describe, expect, it } from "vitest";

import { defaultModuleTab, isSectionAnchor, tabFromHash } from "./tabs";

describe("tabFromHash", () => {
  it.each([
    ["#courses", "courses"],
    ["#groups", "groups-evaluations"],
    ["#assessments", "groups-evaluations"],
    ["#billing", "admin"],
    ["#documents", "admin"],
    ["#trame", "progression"],
    ["#admin", "admin"],
    ["", "courses"],
    ["#inconnu", "courses"],
  ])("%s → %s", (hash, tab) => {
    expect(tabFromHash(hash)).toBe(tab);
  });
});

describe("tabFromHash avec un onglet par défaut", () => {
  it("garde l'ancre prioritaire, et n'utilise le défaut que sans ancre connue", () => {
    expect(tabFromHash("#billing", "progression")).toBe("admin");
    expect(tabFromHash("", "progression")).toBe("progression");
    expect(tabFromHash("#inconnu", "progression")).toBe("progression");
  });
});

describe("defaultModuleTab", () => {
  it("ouvre « Progression » tant qu'elle demande une action, « Séances » sinon", () => {
    expect(defaultModuleTab("overdue")).toBe("progression");
    expect(defaultModuleTab("urgent")).toBe("progression");
    expect(defaultModuleTab("warning")).toBe("progression");
    expect(defaultModuleTab("ok")).toBe("courses");
    expect(defaultModuleTab("unknown")).toBe("courses");
    expect(defaultModuleTab("sent")).toBe("courses");
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
