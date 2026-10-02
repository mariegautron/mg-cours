import { describe, expect, it } from "vitest";

import { parseMarkdown } from "@/lib/pdf/markdown";

import {
  buildSlides,
  CODE_SLICE_LINES,
  MAX_SLIDE_LINES,
  sliceCode,
  slideTitle,
  splitSlides,
} from "./slides";

const slides = (md: string) => splitSlides(parseMarkdown(md));
const specs = (md: string) => buildSlides(parseMarkdown(md));
const types = (s: { type: string }[]) => s.map((b) => b.type);

describe("splitSlides : titres", () => {
  it("ouvre une diapo à chaque titre # ou ##", () => {
    const out = slides("# Intro\n\nBonjour\n\n## Partie 1\n\nTexte");
    expect(out.map(slideTitle)).toEqual(["Intro", "Partie 1"]);
  });

  it("chaque sous-titre (###) ouvre sa propre diapo, avec le titre de section en rappel", () => {
    // Avant US-133, un ### restait dans la diapo de son ## ; il ouvre désormais la sienne.
    const out = specs("## Partie 1\n\nTexte\n\n### Détail\n\nSuite\n\n#### Précision\n\nFin");
    expect(out.map((s) => slideTitle(s.blocks))).toEqual(["Partie 1", "Détail", "Précision"]);
    expect(out.map((s) => s.reminder)).toEqual([null, "Partie 1", "Partie 1"]);
  });

  it("coupe sur --- sans garder le séparateur, et il reste prioritaire", () => {
    const out = slides("Un\n\n---\n\nDeux\n\n---\n\n---\n\nTrois");
    expect(out).toHaveLength(3);
    expect(out.flat().some((b) => b.type === "hr")).toBe(false);
    const forced = slides("## A\n\nTexte\n\n---\n\nSuite de A");
    expect(forced).toHaveLength(2);
  });

  it("garde le texte d'avant le premier titre comme diapo sans titre", () => {
    const out = slides("Préambule\n\n## Suite\n\nTexte");
    expect(out.map(slideTitle)).toEqual([null, "Suite"]);
  });

  it("renvoie aucune diapo pour un contenu vide", () => {
    expect(slides("")).toEqual([]);
    expect(slides("---\n\n---")).toEqual([]);
  });
});

describe("splitSlides : image, tableau, code", () => {
  it("un tableau juste après un titre l'accompagne", () => {
    const out = specs("## Rôles\n\n| A | B |\n| - | - |\n| 1 | 2 |");
    expect(out).toHaveLength(1);
    expect(types(out[0].blocks)).toEqual(["heading", "table"]);
  });

  it("un tableau après du texte a sa propre diapo, avec le titre de section en rappel", () => {
    const out = specs("## Rôles\n\nIntro\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\nAprès");
    expect(out.map((s) => types(s.blocks))).toEqual([
      ["heading", "paragraph"],
      ["table"],
      ["paragraph"],
    ]);
    expect(out[1].reminder).toBe("Rôles");
    expect(out[2].reminder).toBe("Rôles");
  });

  it("une image seule a sa propre diapo", () => {
    const out = specs("## Schéma\n\nVoici :\n\n![Schéma](a.png)\n\nMerci");
    expect(out.map((s) => types(s.blocks))).toEqual([
      ["heading", "paragraph"],
      ["image"],
      ["paragraph"],
    ]);
  });

  it("un bloc de code a sa propre diapo", () => {
    const out = specs("Texte\n\n```\nconst a = 1\n```\n\nFin");
    expect(out.map((s) => types(s.blocks))).toEqual([["paragraph"], ["code"], ["paragraph"]]);
    expect(out[1].part).toBeNull();
  });

  it("un long code est coupé en tranches voisines de 12 lignes, numérotées", () => {
    const code = Array.from({ length: 30 }, (_, i) => `ligne ${i + 1}`).join("\n");
    const out = specs(`## Code\n\n\`\`\`\n${code}\n\`\`\``);
    expect(out).toHaveLength(3);
    expect(out.map((s) => s.part)).toEqual([
      { index: 1, total: 3 },
      { index: 2, total: 3 },
      { index: 3, total: 3 },
    ]);
    // Le titre accompagne la première tranche seulement ; les suivantes rappellent la section.
    expect(types(out[0].blocks)).toEqual(["heading", "code"]);
    expect(out[1].reminder).toBe("Code");
    const joined = out
      .flatMap((s) => s.blocks.filter((b) => b.type === "code"))
      .map((b) => (b as { text: string }).text)
      .join("\n");
    expect(joined).toBe(code);
  });

  it("sliceCode : pas de dernière tranche d'une ligne, tailles voisines", () => {
    expect(sliceCode("a\nb")).toEqual(["a\nb"]);
    const fourteen = Array.from({ length: 14 }, (_, i) => `${i}`).join("\n");
    expect(sliceCode(fourteen)).toHaveLength(1);
    const sizes = sliceCode(Array.from({ length: 25 }, (_, i) => `${i}`).join("\n")).map(
      (s) => s.split("\n").length,
    );
    expect(sizes.reduce((a, b) => a + b)).toBe(25);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(CODE_SLICE_LINES);
    expect(Math.min(...sizes)).toBeGreaterThan(1);
  });
});

describe("splitSlides : contenu trop long", () => {
  it("coupe une longue liste entre deux éléments, jamais dedans", () => {
    const items = Array.from({ length: 30 }, (_, i) => `- élément ${i + 1}`).join("\n");
    const out = specs(`## Liste\n\n${items}`);
    expect(out.length).toBeGreaterThan(1);
    const all = out.flatMap((s) => s.blocks).filter((b) => b.type === "list");
    const count = all.reduce((n, b) => n + (b.type === "list" ? b.items.length : 0), 0);
    expect(count).toBe(30);
    for (const s of out) {
      const lines = s.blocks.reduce((n, b) => n + (b.type === "list" ? b.items.length : 1), 0);
      expect(lines).toBeLessThanOrEqual(MAX_SLIDE_LINES + 1);
    }
    expect(out[1].reminder).toBe("Liste");
  });

  it("coupe un long paragraphe entre deux phrases", () => {
    const sentence = "Voici une phrase qui sert à remplir la diapositive de texte projeté. ";
    const out = specs(`## Texte\n\n${sentence.repeat(30)}`);
    expect(out.length).toBeGreaterThan(1);
    for (const s of out) {
      for (const b of s.blocks) {
        if (b.type !== "paragraph") continue;
        const text = b.runs
          .map((r) => ("text" in r ? r.text : ""))
          .join("")
          .trim();
        expect(text.endsWith(".")).toBe(true);
      }
    }
  });

  it("ne coupe pas un texte court", () => {
    expect(slides("## Court\n\nUne phrase.\n\n- a\n- b")).toHaveLength(1);
  });

  it("ne coupe jamais un tableau, même long", () => {
    const rows = Array.from({ length: 25 }, (_, i) => `| ${i} | x |`).join("\n");
    const out = specs(`## T\n\n| A | B |\n| - | - |\n${rows}`);
    expect(out).toHaveLength(1);
    expect(types(out[0].blocks)).toEqual(["heading", "table"]);
  });
});
