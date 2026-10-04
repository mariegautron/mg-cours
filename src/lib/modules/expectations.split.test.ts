import { describe, expect, it } from "vitest";

import {
  cleanExpectationLabel,
  parseExpectationsFromFiche,
  planExpectationSplits,
  splitExpectationLabel,
} from "./expectations";

const MERGED =
  "Introduction à l'Agilité: - Valeurs et principes - Différence agile vs cycle en V Les différents rôles scrum Les frameworks existants Néant Néant Néant # Modalité VH Objectifs UP Projet lié Description / Livrable Syllabus capsule";

describe("attendu fusionné par la lecture d'une fiche", () => {
  it("retire l'en-tête de tableau et les colonnes vides", () => {
    expect(cleanExpectationLabel(MERGED)).toBe(
      "Introduction à l'Agilité: - Valeurs et principes - Différence agile vs cycle en V Les différents rôles scrum Les frameworks existants",
    );
  });

  it("scinde par puces : titre puis éléments", () => {
    expect(splitExpectationLabel(MERGED)).toEqual([
      "Introduction à l'Agilité",
      "Valeurs et principes",
      "Différence agile vs cycle en V",
      "Les différents rôles scrum",
      "Les frameworks existants",
    ]);
  });

  it("scinde aussi les lignes d'une liste sans puces (retour à la ligne + majuscule)", () => {
    expect(
      splitExpectationLabel(
        "Introduction à l'Agilité:\n- Valeurs et principes\n- Différence agile vs cycle en V\nLes différents rôles scrum\nLes frameworks existants\nNéant Néant",
      ),
    ).toEqual([
      "Introduction à l'Agilité",
      "Valeurs et principes",
      "Différence agile vs cycle en V",
      "Les différents rôles scrum",
      "Les frameworks existants",
    ]);
  });

  it("un attendu simple reste entier", () => {
    expect(splitExpectationLabel("Cadrer un projet agile")).toEqual(["Cadrer un projet agile"]);
  });

  it("la lecture de la fiche donne l'unité puis ses puces, sans tableau ni « Néant »", () => {
    const fiche = `Objectifs pédagogiques\n- Recueillir un besoin\nUnités pédagogiques\n# Modalité VH Objectifs UP Projet lié Description / Livrable Syllabus capsule\n1 FFP 3h Introduction à l'Agilité: - Valeurs et principes - Différence agile vs cycle en V Néant Néant Néant # Modalité VH Objectifs UP Projet lié Description / Livrable Syllabus capsule\n2 TDP 4h Estimation et planification`;
    const drafts = parseExpectationsFromFiche(fiche);
    expect(drafts.map((d) => [d.kind, d.label])).toEqual([
      ["objective", "Recueillir un besoin"],
      ["unit", "Introduction à l'Agilité"],
      ["objective", "Valeurs et principes"],
      ["objective", "Différence agile vs cycle en V"],
      ["unit", "Estimation et planification"],
    ]);
    expect(drafts[1]).toMatchObject({ hours: 3, modality: "FFP" });
  });
});

describe("découpage des attendus « blocs » du module", () => {
  const BLOCKS = [
    "Introduction à l'Agilité: - Valeurs et principes - Différence agile vs cycle en V Les différents rôles scrum Les frameworks existants Néant Néant Néant # Modalité VH Objectifs UP Projet lié Description / Livrable Syllabus capsule",
    "Création d'un backlog produit Construction d'un board Scrum Néant Néant",
    "Les estimations en agile: - Planning poker - Story points et vélocité Néant Néant Néant",
    "Atelier de poker planning Planification suite en sprint backlog Néant Néant Néant",
  ];

  it("coupe chacun des quatre textes, sans « Néant » ni en-tête de tableau", () => {
    expect(BLOCKS.map(splitExpectationLabel)).toEqual([
      [
        "Introduction à l'Agilité",
        "Valeurs et principes",
        "Différence agile vs cycle en V",
        "Les différents rôles scrum",
        "Les frameworks existants",
      ],
      ["Création d'un backlog produit", "Construction d'un board Scrum"],
      ["Les estimations en agile", "Planning poker", "Story points et vélocité"],
      ["Atelier de poker planning", "Planification suite en sprint backlog"],
    ]);
  });

  it("le plan ne retient que les attendus à découper, dans l'ordre", () => {
    const plan = planExpectationSplits([
      { id: "a", kind: "objective", label: "Cadrer un projet agile" },
      ...BLOCKS.map((label, i) => ({ id: `b${i}`, kind: "unit" as const, label })),
    ]);
    expect(plan.map((p) => p.id)).toEqual(["b0", "b1", "b2", "b3"]);
    expect(plan[1].parts[0]).toBe("Création d'un backlog produit");
  });

  it("ne coupe pas un attendu court ni un nom propre en milieu de phrase", () => {
    expect(splitExpectationLabel("Découvrir l'écosystème Docker Compose")).toHaveLength(1);
    expect(
      splitExpectationLabel("Piloter un projet avec Scrum et animer les cérémonies de l'équipe"),
    ).toHaveLength(1);
  });
});
