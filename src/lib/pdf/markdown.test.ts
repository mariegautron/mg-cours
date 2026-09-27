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

  it("reconnaît un saut de ligne <br>", () => {
    expect(parseInline("a<br>b<br/>c<br />d")).toEqual([
      { text: "a" },
      { break: true },
      { text: "b" },
      { break: true },
      { text: "c" },
      { break: true },
      { text: "d" },
    ]);
  });

  it("garde le texte brut quand il n'y a pas de balisage", () => {
    expect(parseInline("2 * 3 = 6")).toEqual([{ text: "2 * 3 = 6" }]);
  });

  it("échappe le HTML dangereux : jamais interprété, toujours affiché en texte", () => {
    expect(parseInline('<script>alert(1)</script> <img src=x onerror="alert(1)">')).toEqual([
      { text: '<script>alert(1)</script> <img src=x onerror="alert(1)">' },
    ]);
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
      items: [
        { runs: [{ text: "un" }], checked: null, children: [] },
        { runs: [{ text: "deux" }], checked: null, children: [] },
      ],
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

  it("va jusqu'au niveau de titre 6 (plafonné à 6)", () => {
    expect(parseMarkdown("#### Quatre")[0]).toMatchObject({ type: "heading", level: 4 });
    expect(parseMarkdown("###### Six")[0]).toMatchObject({ type: "heading", level: 6 });
    expect(parseMarkdown("")).toEqual([]);
  });

  it("reconnaît un séparateur --- comme un bloc hr, distinct d'une ligne de délimitation de tableau", () => {
    expect(parseMarkdown("a\n\n---\n\nb").map((b) => b.type)).toEqual([
      "paragraph",
      "hr",
      "paragraph",
    ]);
  });

  it("parse un tableau GFM avec alignement et mise en forme dans les cellules", () => {
    const blocks = parseMarkdown(
      "| Nom | Points |\n| :--- | ---: |\n| **Alice** | `20` |\n| Bob | 15 |",
    );
    expect(blocks).toEqual([
      {
        type: "table",
        align: ["left", "right"],
        header: [[{ text: "Nom" }], [{ text: "Points" }]],
        rows: [
          [[{ text: "Alice", bold: true }], [{ text: "20", code: true }]],
          [[{ text: "Bob" }], [{ text: "15" }]],
        ],
      },
    ]);
  });

  it("arrête un tableau à la première ligne vide ou sans pipe", () => {
    const blocks = parseMarkdown("| a | b |\n| --- | --- |\n| 1 | 2 |\n\nsuite");
    expect(blocks.map((b) => b.type)).toEqual(["table", "paragraph"]);
    expect((blocks[0] as { rows: unknown[] }).rows).toHaveLength(1);
  });

  it("reconnaît les cases à cocher, en lecture seule", () => {
    const blocks = parseMarkdown("- [ ] à faire\n- [x] fait\n- [X] fait aussi");
    expect(blocks[0]).toMatchObject({
      type: "list",
      items: [
        { checked: false, runs: [{ text: "à faire" }] },
        { checked: true, runs: [{ text: "fait" }] },
        { checked: true, runs: [{ text: "fait aussi" }] },
      ],
    });
  });

  it("imbrique les listes selon l'indentation, avec un mélange ordonné/non ordonné", () => {
    const blocks = parseMarkdown("- un\n  1. a\n  2. b\n- deux");
    expect(blocks).toHaveLength(1);
    const list = blocks[0] as { type: "list"; ordered: boolean; items: unknown[] };
    expect(list.ordered).toBe(false);
    expect(list.items).toHaveLength(2);
    const first = list.items[0] as {
      runs: unknown;
      children: { ordered: boolean; items: unknown[] }[];
    };
    expect(first.children).toHaveLength(1);
    expect(first.children[0].ordered).toBe(true);
    expect(first.children[0].items).toHaveLength(2);
    const second = list.items[1] as { children: unknown[] };
    expect(second.children).toEqual([]);
  });

  it("lit un encadré <aside> comme du Markdown imbriqué", () => {
    const blocks = parseMarkdown("Avant\n\n<aside>\n**Important** : relire.\n</aside>\n\nAprès");
    expect(blocks.map((b) => b.type)).toEqual(["paragraph", "callout", "paragraph"]);
    const callout = blocks[1] as { blocks: { type: string }[] };
    expect(callout.blocks).toEqual([
      { type: "paragraph", runs: [{ text: "Important", bold: true }, { text: " : relire." }] },
    ]);
  });

  it("n'interprète jamais du HTML arbitraire (échappé, affiché en texte)", () => {
    const blocks = parseMarkdown(
      'Texte <script>alert(1)</script> et <img src=x onerror="alert(1)">.',
    );
    expect(blocks).toEqual([
      {
        type: "paragraph",
        runs: [{ text: 'Texte <script>alert(1)</script> et <img src=x onerror="alert(1)">.' }],
      },
    ]);
  });
});
