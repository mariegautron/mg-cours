import { describe, expect, it } from "vitest";

import {
  coverageState,
  formatCoverage,
  keywords,
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
