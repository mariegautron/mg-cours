import { describe, expect, it } from "vitest";

import {
  draftsFromText,
  parseExpectationLines,
  parseExpectationsFromFiche,
  unitsHours,
} from "./expectations";

const FICHE = `FICHE PÉDAGOGIQUE
Nom long Analyse des Besoins & Faisabilité Technique
Volume heures totales
FFP TDP
28h 10h 18h
Objectifs pédagogiques
• Recueillir et formaliser un besoin client
• Évaluer la faisabilité technique d'un projet
  numérique et ses risques
- Restituer une analyse à un comité
Évaluation
Étude de cas
Unités pédagogiques
1 FFP 3h Cadrage du besoin et des parties prenantes
2 TDP 4,5h Étude de faisabilité technique
sur un cas réel
3 FFP 3h Restitution`;

describe("parseExpectationsFromFiche", () => {
  const drafts = parseExpectationsFromFiche(FICHE);
  const objectives = drafts.filter((d) => d.kind === "objective");
  const units = drafts.filter((d) => d.kind === "unit");

  it("lit les objectifs pédagogiques, puces et retours à la ligne recollés", () => {
    expect(objectives.map((o) => o.label)).toEqual([
      "Recueillir et formaliser un besoin client",
      "Évaluer la faisabilité technique d'un projet numérique et ses risques",
      "Restituer une analyse à un comité",
    ]);
    expect(objectives.every((o) => o.hours === null && o.modality === null)).toBe(true);
  });

  it("s'arrête au titre de section suivant (évaluation)", () => {
    expect(objectives.some((o) => /Étude de cas/.test(o.label))).toBe(false);
  });

  it("lit l'objectif, la modalité et les heures de chaque unité", () => {
    expect(units).toEqual([
      {
        kind: "unit",
        label: "Cadrage du besoin et des parties prenantes",
        hours: 3,
        modality: "FFP",
      },
      {
        kind: "unit",
        label: "Étude de faisabilité technique sur un cas réel",
        hours: 4.5,
        modality: "TDP",
      },
      { kind: "unit", label: "Restitution", hours: 3, modality: "FFP" },
    ]);
  });

  it("gère un texte sans retour à la ligne", () => {
    const flat = parseExpectationsFromFiche(
      "Objectifs pédagogiques • Analyser un besoin • Cadrer un projet Unités pédagogiques 1 FFP 3h Cadrage 2 TDP 4h Atelier",
    );
    expect(flat.map((d) => [d.kind, d.label])).toEqual([
      ["objective", "Analyser un besoin"],
      ["objective", "Cadrer un projet"],
      ["unit", "Cadrage"],
      ["unit", "Atelier"],
    ]);
  });

  it("ne renvoie rien sur un texte sans rapport", () => {
    expect(parseExpectationsFromFiche("Bonjour, voici un texte quelconque.")).toEqual([]);
  });
});

describe("parseExpectationLines", () => {
  it("une ligne = un attendu, puces et numéros retirés", () => {
    const drafts = parseExpectationLines("- Comprendre le RGAA\n2) Auditer une page\n\n  \nOk");
    expect(drafts.map((d) => d.label)).toEqual(["Comprendre le RGAA", "Auditer une page"]);
    expect(drafts.every((d) => d.kind === "objective")).toBe(true);
  });
});

describe("unitsHours", () => {
  const list = [
    { kind: "objective" as const, label: "Objectif", hours: null },
    { kind: "unit" as const, label: "Cadrage", hours: 3 },
    { kind: "unit" as const, label: "x".repeat(200), hours: 4 },
  ];

  it("additionne les heures des unités à titre indicatif", () => {
    expect(unitsHours(list)).toBe(7);
  });
});

describe("parseExpectationsFromFiche — puces « - » sur une seule ligne", () => {
  it("découpe les objectifs d'un PDF fusionné", () => {
    const flat = parseExpectationsFromFiche(
      "Objectifs pedagogiques - Recueillir un besoin client - Evaluer la faisabilite technique Unites pedagogiques 1 FFP 3h Cadrage",
    );
    expect(flat.filter((d) => d.kind === "objective").map((d) => d.label)).toEqual([
      "Recueillir un besoin client",
      "Evaluer la faisabilite technique",
    ]);
  });
});

describe("draftsFromText", () => {
  it("préfère la fiche complète", () => {
    expect(draftsFromText(FICHE).some((d) => d.kind === "unit")).toBe(true);
  });
  it("retombe sur une ligne par attendu", () => {
    const drafts = draftsFromText("Recueillir un besoin\nÉvaluer la faisabilité");
    expect(drafts.map((d) => d.label)).toEqual(["Recueillir un besoin", "Évaluer la faisabilité"]);
  });
  it("texte sans contenu : aucun attendu", () => {
    expect(draftsFromText("  \n ")).toEqual([]);
  });
});
