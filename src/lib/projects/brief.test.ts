import { describe, expect, it } from "vitest";

import {
  addSection,
  BRIEF_MODELS,
  isBriefEmpty,
  isPlaceholderSection,
  MAX_SECTIONS,
  modelByKey,
  moveSection,
  parseBrief,
  removeSection,
  sectionSummary,
  serializeBrief,
} from "./brief";

describe("modèles de départ", () => {
  it("trois modèles, chacun avec des sections titrées ; la page blanche en a une vide", () => {
    expect(BRIEF_MODELS.map((m) => m.key)).toEqual(["client_role_play", "several_themes", "blank"]);
    for (const m of BRIEF_MODELS) expect(m.sections.every((s) => s.title.trim())).toBe(true);
    expect(modelByKey("blank")?.sections).toHaveLength(1);
    expect(modelByKey("nope")).toBeUndefined();
  });
  it("les modèles prévoient des phases", () => {
    expect(modelByKey("client_role_play")?.sections.some((s) => /phases/i.test(s.title))).toBe(
      true,
    );
    expect(modelByKey("several_themes")?.sections.some((s) => /phases/i.test(s.title))).toBe(true);
  });
});

describe("parseBrief / serializeBrief", () => {
  it("aller-retour sans perte", () => {
    for (const m of BRIEF_MODELS) {
      expect(parseBrief(serializeBrief(m.sections))).toEqual(
        m.sections.map((s) => ({ title: s.title, body: s.body.trim() })),
      );
    }
  });
  it("texte avant le premier titre = « Présentation » ; ancien brief libre repris tel quel", () => {
    expect(parseBrief("Un brief simple.\n\nSur deux lignes.")).toEqual([
      { title: "Présentation", body: "Un brief simple.\n\nSur deux lignes." },
    ]);
    expect(parseBrief("Intro\n\n## Contexte\ntexte")).toEqual([
      { title: "Présentation", body: "Intro" },
      { title: "Contexte", body: "texte" },
    ]);
  });
  it("un ## dans le corps ne casse pas les sections, un ## dans un bloc de code non plus", () => {
    const md = serializeBrief([
      { title: "A", body: "## faux titre\ntexte" },
      { title: "B", body: "```\n## dans le code\n```" },
    ]);
    const sections = parseBrief(md);
    expect(sections.map((s) => s.title)).toEqual(["A", "B"]);
    expect(sections[0].body).toContain("### faux titre");
    expect(sections[1].body).toContain("## dans le code");
  });
  it("ignore les sections entièrement vides, titre manquant remplacé", () => {
    expect(
      serializeBrief([
        { title: "", body: "" },
        { title: " ", body: "x" },
      ]),
    ).toBe("## Sans titre\n\nx");
    expect(serializeBrief([])).toBe("");
  });
  it("brief vide", () => {
    expect(parseBrief("  \n")).toEqual([]);
    expect(isBriefEmpty("")).toBe(true);
    expect(isBriefEmpty("## A\n\n")).toBe(true);
    expect(isBriefEmpty("## A\n\nx")).toBe(false);
  });
});

describe("ordre et ajout", () => {
  const s = (t: string) => ({ title: t, body: "" });
  it("déplace sans toucher aux extrémités", () => {
    expect(moveSection(["a", "b", "c"], 1, "up")).toEqual(["b", "a", "c"]);
    expect(moveSection(["a", "b", "c"], 2, "down")).toEqual(["a", "b", "c"]);
  });
  it("ajoute à la fin, dans la limite, et supprime", () => {
    expect(addSection([s("a")], "Contexte").map((x) => x.title)).toEqual(["a", "Contexte"]);
    const full = Array.from({ length: MAX_SECTIONS }, (_, i) => s(String(i)));
    expect(addSection(full)).toHaveLength(MAX_SECTIONS);
    expect(removeSection([s("a"), s("b")], 0).map((x) => x.title)).toEqual(["b"]);
  });
});

describe("sectionSummary", () => {
  it("première ligne utile, sans puce ni mise en forme, coupée", () => {
    expect(sectionSummary("\n- **Délai** : 6 semaines\n- Budget")).toBe("Délai : 6 semaines");
    expect(sectionSummary("1. Cadrage\n2. Réalisation")).toBe("Cadrage");
    expect(sectionSummary("")).toBe("");
    expect(sectionSummary("a".repeat(200))).toHaveLength(110);
  });
});

describe("isPlaceholderSection", () => {
  it("une section du modèle laissée telle quelle reste à rédiger", () => {
    const model = BRIEF_MODELS[0].sections[0];
    expect(isPlaceholderSection({ ...model })).toBe(true);
    expect(isPlaceholderSection({ title: model.title, body: "" })).toBe(true);
    expect(isPlaceholderSection({ title: model.title, body: "Le Père Noël, qui gère…" })).toBe(
      false,
    );
  });
});
