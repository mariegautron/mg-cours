import { describe, expect, it } from "vitest";

import { cleanSlidesUrl } from "./slides";

describe("cleanSlidesUrl", () => {
  it("vide : pas de lien", () => {
    expect(cleanSlidesUrl("  ")).toEqual({ ok: true, url: null });
  });
  it("ajoute https quand il manque", () => {
    expect(cleanSlidesUrl("figma.com/slides/abc")).toEqual({
      ok: true,
      url: "https://figma.com/slides/abc",
    });
  });
  it("refuse javascript: et data:", () => {
    expect(cleanSlidesUrl("javascript:alert(1)").ok).toBe(false);
    expect(cleanSlidesUrl("data:text/html,x").ok).toBe(false);
  });
  it("refuse un lien illisible ou trop long", () => {
    expect(cleanSlidesUrl("https://").ok).toBe(false);
    expect(cleanSlidesUrl(`https://x.fr/${"a".repeat(600)}`).ok).toBe(false);
  });
});
