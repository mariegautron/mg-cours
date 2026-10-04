import { describe, expect, it } from "vitest";

import { assessmentForPhase, parsePhases } from "./phases";

const brief = `## Contexte\n\nUn client.\n\n## Phases du projet\n\n1. Cadrage du besoin — livrable : dossier de cadrage\n2. Organisation et planification\n- Soutenance client (pitch de 10 minutes)\n\n## Règles\n\n- Une règle`;

describe("parsePhases", () => {
  it("lit une phase par ligne de liste, avec son livrable", () => {
    expect(parsePhases(brief)).toEqual([
      { title: "Cadrage du besoin", deliverable: "dossier de cadrage" },
      { title: "Organisation et planification", deliverable: null },
      { title: "Soutenance client", deliverable: "pitch de 10 minutes" },
    ]);
  });
  it("sans section de phases, rien", () => {
    expect(parsePhases("## Contexte\n\n- Un point")).toEqual([]);
    expect(parsePhases("")).toEqual([]);
  });
});

describe("assessmentForPhase", () => {
  const list = [
    { id: "a", title: "Jalon 1 : Cadrage du besoin" },
    { id: "b", title: "Oral de fin de projet" },
  ];
  it("retrouve l'évaluation par le titre, sans accent ni casse", () => {
    expect(assessmentForPhase({ title: "cadrage du besoin", deliverable: null }, list)?.id).toBe(
      "a",
    );
  });
  it("aucune évaluation : null", () => {
    expect(assessmentForPhase({ title: "Organisation", deliverable: null }, list)).toBeNull();
  });
});
