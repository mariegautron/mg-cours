import { describe, expect, it } from "vitest";

import { parseInline, parseMarkdown } from "./markdown";

describe("parseInline", () => {
  it("reconnaît gras, italique, code et liens", () => {
    expect(parseInline("a **b** *c* `d` [e](https://x.fr)")).toEqual([
      { text: "a " },
      { text: "b", bold: true },
      { text: " " },
      { text: "c", italic: true },
      { text: " " },
      { text: "d", code: true },
      { text: " " },
      { text: "e", href: "https://x.fr" },
    ]);
  });

  it("remplace une image en ligne par son texte alternatif", () => {
    expect(parseInline("voir ![le schéma](a.png) ici")).toEqual([
      { text: "voir " },
      { text: "le schéma" },
      { text: " ici" },
    ]);
  });

  it("garde le texte brut quand il n'y a pas de balisage", () => {
    expect(parseInline("2 * 3 = 6")).toEqual([{ text: "2 * 3 = 6" }]);
  });
});

describe("parseMarkdown", () => {
  it("découpe titres, paragraphes, listes et code", () => {
    const blocks = parseMarkdown(
      "# Titre\n\nUne ligne\nsuite.\n\n- un\n- deux\n\n1. a\n2. b\n\n```\ncode\n```\n",
    );
    expect(blocks.map((b) => b.type)).toEqual(["heading", "paragraph", "list", "list", "code"]);
    expect(blocks[1]).toEqual({ type: "paragraph", runs: [{ text: "Une ligne suite." }] });
    expect(blocks[2]).toMatchObject({
      ordered: false,
      items: [[{ text: "un" }], [{ text: "deux" }]],
    });
    expect(blocks[3]).toMatchObject({ ordered: true });
    expect(blocks[4]).toEqual({ type: "code", text: "code" });
  });

  it("reconnaît une image seule sur sa ligne", () => {
    expect(parseMarkdown('Avant\n![Schéma](Page%20A/schema.png "titre")\nAprès')).toEqual([
      { type: "paragraph", runs: [{ text: "Avant" }] },
      { type: "image", alt: "Schéma", src: "Page%20A/schema.png" },
      { type: "paragraph", runs: [{ text: "Après" }] },
    ]);
  });

  it("plafonne les titres au niveau 3 et gère un texte vide", () => {
    expect(parseMarkdown("###### Profond")[0]).toMatchObject({ type: "heading", level: 3 });
    expect(parseMarkdown("")).toEqual([]);
  });
});
