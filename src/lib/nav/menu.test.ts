import { describe, expect, it } from "vitest";

import { activeEntry, BREAKPOINTS, entriesForForm, menuFormForWidth, MENU_ENTRIES } from "./menu";

describe("menuFormForWidth", () => {
  it("téléphone, tablette, ordinateur aux seuils", () => {
    expect(menuFormForWidth(320)).toBe("bottom");
    expect(menuFormForWidth(BREAKPOINTS.tablet - 1)).toBe("bottom");
    expect(menuFormForWidth(BREAKPOINTS.tablet)).toBe("rail");
    expect(menuFormForWidth(BREAKPOINTS.desktop - 1)).toBe("rail");
    expect(menuFormForWidth(BREAKPOINTS.desktop)).toBe("full");
    expect(menuFormForWidth(1920)).toBe("full");
  });
});

describe("entriesForForm", () => {
  it("menu complet et rail : les cinq entrées", () => {
    expect(entriesForForm("full").main).toHaveLength(5);
    expect(entriesForForm("rail").main).toHaveLength(5);
    expect(entriesForForm("rail").drawer).toEqual([]);
  });
  it("barre du bas : quatre entrées, le reste dans le tiroir, rien de perdu", () => {
    const { main, drawer } = entriesForForm("bottom");
    expect(main.map((e) => e.key)).toEqual(["dashboard", "modules", "students", "library"]);
    expect(drawer.map((e) => e.key)).toEqual(["settings"]);
    expect([...main, ...drawer]).toEqual(MENU_ENTRIES);
  });
});

describe("activeEntry", () => {
  it("par préfixe d'URL", () => {
    expect(activeEntry("/modules/abc/build")).toBe("modules");
    expect(activeEntry("/modules")).toBe("modules");
    expect(activeEntry("/resources/x")).toBe("library");
    expect(activeEntry("/modulesx")).toBeNull();
    expect(activeEntry("/")).toBeNull();
  });
});
