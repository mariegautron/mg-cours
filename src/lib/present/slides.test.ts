import { describe, expect, it } from "vitest";

import { parseMarkdown } from "@/lib/pdf/markdown";

import { slideTitle, splitSlides } from "./slides";

const slides = (md: string) => splitSlides(parseMarkdown(md));

describe("splitSlides", () => {
  it("ouvre une diapo à chaque titre # ou ##", () => {
    const out = slides("# Intro\n\nBonjour\n\n## Partie 1\n\nTexte\n\n### Détail\n\nSuite");
    expect(out).toHaveLength(2);
    expect(out.map(slideTitle)).toEqual(["Intro", "Partie 1"]);
    // Un ### reste dans la diapo de son ##.
    expect(out[1].some((b) => b.type === "heading" && b.level === 3)).toBe(true);
  });

  it("coupe sur --- sans garder le séparateur", () => {
    const out = slides("Un\n\n---\n\nDeux\n\n---\n\n---\n\nTrois");
    expect(out).toHaveLength(3);
    expect(out.flat().some((b) => b.type === "hr")).toBe(false);
  });

  it("garde le texte d'avant le premier titre comme diapo sans titre", () => {
    const out = slides("Préambule\n\n## Suite\n\nTexte");
    expect(out.map(slideTitle)).toEqual([null, "Suite"]);
  });

  it("renvoie aucune diapo pour un contenu vide", () => {
    expect(slides("")).toEqual([]);
  });
});
