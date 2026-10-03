import { describe, expect, it } from "vitest";

import { cleanPaste, insertAtSelection, slidePreviews } from "./paste";

describe("cleanPaste", () => {
  it("puces de Word et de Notion → tirets, indentation conservée", () => {
    expect(cleanPaste("•\tà tort".replace("\t", " "))).toBe("- à tort");
    expect(cleanPaste("• Un\n  ◦ Deux\n▪ Trois")).toBe("- Un\n  - Deux\n- Trois");
    expect(cleanPaste("o\tSous-point")).toBe("  - Sous-point");
  });
  it("listes numérotées « 1) » → « 1. »", () => {
    expect(cleanPaste("1) Un\n2) Deux")).toBe("1. Un\n2. Deux");
  });
  it("espaces insécables, caractères invisibles, fins de ligne Windows, blancs en trop", () => {
    expect(cleanPaste("A B​C  \r\n\r\n\r\n\r\nD\t")).toBe("A BC\n\nD");
  });
  it("laisse le Markdown existant intact", () => {
    const md = "## Titre\n\n- a\n- b\n\n1. un\n2. deux\n\n**gras** et `code`";
    expect(cleanPaste(md)).toBe(md);
  });
});

describe("insertAtSelection", () => {
  it("remplace la sélection et place le curseur après le collage", () => {
    expect(insertAtSelection("abcdef", 2, 4, "XY")).toEqual({ text: "abXYef", cursor: 4 });
    expect(insertAtSelection("abc", 99, 99, "Z")).toEqual({ text: "abcZ", cursor: 4 });
  });
});

describe("slidePreviews", () => {
  it("même découpage que la projection : titres, séparateur, éléments non textuels", () => {
    const md =
      "## Intro\n\nBienvenue dans le cours.\n\n---\n\n## Liste\n\n- un\n- deux\n\n```\ncode\n```";
    const slides = slidePreviews(md);
    expect(slides.length).toBeGreaterThanOrEqual(3);
    expect(slides[0]).toMatchObject({
      number: 1,
      title: "Intro",
      summary: "Bienvenue dans le cours.",
    });
    expect(slides.some((s) => s.extras.includes("code"))).toBe(true);
    expect(slides.map((s) => s.number)).toEqual(slides.map((_, i) => i + 1));
  });
  it("contenu vide : aucune diapo", () => {
    expect(slidePreviews("  \n")).toEqual([]);
  });
});
