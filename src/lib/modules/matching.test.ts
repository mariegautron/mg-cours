import { describe, expect, it } from "vitest";

import {
  coverageState,
  formatCoverage,
  isWholeCourse,
  keywords,
  matchLevel,
  matchPercent,
  matchReason,
  matchResources,
  summarizeCoverage,
  type MatchableResource,
} from "./matching";

const res = (
  id: string,
  title: string,
  tags: string[] = [],
  content: string | null = null,
): MatchableResource => ({ id, title, tags, content });

describe("keywords", () => {
  it("ignore casse, accents, mots vides et mots courts, ramène les pluriels au singulier", () => {
    expect(keywords("Évaluer les Risques ET la faisabilité des projets")).toEqual([
      "evaluer",
      "risque",
      "faisabilite",
      "projet",
    ]);
  });

  it("dédoublonne et gère le vide", () => {
    expect(keywords("audit Audit AUDITS")).toEqual(["audit"]);
    expect(keywords("")).toEqual([]);
  });
});

describe("matchResources", () => {
  const list = [
    res("1", "TP audit d'accessibilité", ["RGAA", "audit"]),
    res("2", "Introduction à Scrum", ["agile"], "Le sprint et la rétrospective"),
    res("3", "Notes", [], "On y évoque l'accessibilité des sites et des pages web"),
    res("4", "Recette de cuisine", ["dessert"]),
  ];

  it("trouve les ressources qui partagent des mots-clés, tags et titre avant contenu", () => {
    const matches = matchResources("Auditer l'accessibilité d'un site", list);
    expect(matches.map((m) => m.resource.id)).toEqual(["1", "3"]);
    expect(matches[0].shared).toContain("accessibilite");
    expect(matches[0].score).toBeGreaterThan(matches[1].score);
  });

  it("affiche un extrait du contenu où figure le mot commun (US-56)", () => {
    const matches = matchResources("Auditer l'accessibilité d'un site", list);
    const notes = matches.find((m) => m.resource.id === "3");
    expect(notes?.excerpt).toMatchObject({ field: "content", match: "accessibilité" });
  });

  it("ne propose rien sans mot commun ni sans mot-clé dans l'attendu", () => {
    expect(matchResources("Comprendre la fiscalité internationale", list)).toEqual([]);
    expect(matchResources("de la et", list)).toEqual([]);
  });

  it("limite le nombre de propositions", () => {
    const many = Array.from({ length: 10 }, (_, i) => res(String(i), `Accessibilité ${i}`));
    expect(matchResources("accessibilité", many, 3)).toHaveLength(3);
  });

  it("est insensible aux accents et à la casse", () => {
    expect(
      matchResources("ACCESSIBILITE", [res("a", "Accessibilité web")]).map((m) => m.resource.id),
    ).toEqual(["a"]);
  });
});

describe("coverageState", () => {
  it("couvert par une séance ou par une ressource prête retenue", () => {
    expect(coverageState({ courseIds: ["c1"], retainedMatches: [] })).toBe("covered");
    expect(coverageState({ courseIds: [], retainedMatches: [{ status: "ready" }] })).toBe(
      "covered",
    );
  });

  it("à construire quand seule une ressource « à construire » est retenue", () => {
    expect(coverageState({ courseIds: [], retainedMatches: [{ status: "progress" }] })).toBe(
      "to_build",
    );
  });

  it("non couvert sinon", () => {
    expect(coverageState({ courseIds: [], retainedMatches: [] })).toBe("uncovered");
  });
});

describe("summarizeCoverage / formatCoverage", () => {
  it("compte et formate le bilan", () => {
    const s = summarizeCoverage([
      "covered",
      "covered",
      "covered",
      "covered",
      "to_build",
      "to_build",
    ]);
    expect(s).toEqual({ covered: 4, toBuild: 2, uncovered: 0, total: 6 });
    expect(formatCoverage(s)).toBe("4 couverts, 2 à construire");
  });

  it("signale les attendus sans ressource et le cas vide", () => {
    expect(formatCoverage({ covered: 1, toBuild: 0, uncovered: 2, total: 3 })).toBe(
      "1 couvert, 2 sans ressource",
    );
    expect(formatCoverage({ covered: 0, toBuild: 0, uncovered: 0, total: 0 })).toBe(
      "Aucun attendu à rapprocher.",
    );
  });
});

describe("niveau de correspondance (US-153)", () => {
  it("score sur 100 relatif aux mots de l'attendu, niveau en mots", () => {
    expect(matchPercent(8, 2)).toBe(100);
    expect(matchPercent(4, 2)).toBe(50);
    expect(matchPercent(1, 4)).toBe(6);
    expect(matchPercent(5, 0)).toBe(0);
    expect(matchLevel(100)).toBe("strong");
    expect(matchLevel(50)).toBe("strong");
    expect(matchLevel(49)).toBe("medium");
    expect(matchLevel(25)).toBe("medium");
    expect(matchLevel(24)).toBe("weak");
  });
  it("raison en une phrase, par endroit", () => {
    expect(matchReason({ tag: ["agile"], title: [], description: [], content: [] })).toBe(
      "Mots de l’attendu retrouvés dans les tags (agile).",
    );
    expect(
      matchReason({
        tag: ["agile"],
        title: ["scrum"],
        description: [],
        content: ["sprint", "backlog"],
      }),
    ).toBe(
      "Mots de l’attendu retrouvés dans les tags (agile), le titre (scrum) et le contenu (sprint, backlog).",
    );
    expect(matchReason({ tag: [], title: [], description: [], content: [] })).toBe(
      "Aucun mot commun.",
    );
  });
  it("matchResources renseigne niveau, score et raison", () => {
    const [m] = matchResources("Méthodes agiles et scrum", [
      { id: "1", title: "Scrum en pratique", tags: ["agile"], content: null },
    ]);
    expect(m.level).toBe("strong");
    expect(m.percent).toBe(58);
    expect(m.reason).toContain("les tags (agile)");
    expect(m.reason).toContain("le titre (scrum)");
  });
});

describe("cours complet et briques", () => {
  it("à score égal, les briques passent avant le cours complet", () => {
    const base = { description: null, content: null };
    const resources = [
      { ...base, id: "parent", title: "Agile", tags: ["agile", "Cours complet"] },
      { ...base, id: "b2", title: "Agile — Section 2", tags: ["agile"] },
      { ...base, id: "b1", title: "Agile — Section 1", tags: ["agile"] },
    ];
    const ids = matchResources("agile", resources).map((m) => m.resource.id);
    expect(ids).toEqual(["b1", "b2", "parent"]);
    expect(isWholeCourse(resources[0])).toBe(true);
    expect(isWholeCourse(resources[1])).toBe(false);
  });
});
