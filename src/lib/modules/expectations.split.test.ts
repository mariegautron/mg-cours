import { describe, expect, it } from "vitest";

import {
  cleanExpectationLabel,
  parseExpectationsFromFiche,
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
      "Différence agile vs cycle en V Les différents rôles scrum Les frameworks existants",
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
