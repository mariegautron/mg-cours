import { describe, expect, it } from "vitest";

import { parseFiche, validateFicheHours, findInconsistentModules } from "./fiche";

const FICHE = `FICHE PEDAGOGIQUE
YNOV Campus Nantes
Intitule du module : Methodologies Agile & Scrum
Code module : A2627_4752
Mastre 1 Informatique
Volume horaire total : 21 h
FFP : 10 h
TDP : 11 h`;

describe("parseFiche", () => {
  it("extrait les champs d'une fiche complete", () => {
    expect(parseFiche(FICHE, ["YNOV Campus Nantes", "MyDigitalSchool"])).toEqual({
      name: "Methodologies Agile & Scrum",
      ycode: "A2627_4752",
      year: 2026,
      level: "Mastre 1 Informatique",
      totalHours: 21,
      hoursLecture: 10,
      hoursTd: 11,
      schoolName: "YNOV Campus Nantes",
    });
  });

  it("deduit le total des sous-volumes quand il n'est pas indique", () => {
    const r = parseFiche("Module : Web\nCM 8 h\nTP 12 h");
    expect(r.totalHours).toBe(20);
    expect(r.hoursTp).toBe(12);
  });

  it("ne deborde pas sur la ligne suivante pour le niveau", () => {
    expect(parseFiche("Bachelor 3\nVolume horaire : 12 h").level).toBe("Bachelor 3");
  });

  it("ne renvoie rien d'invente sur un texte sans rapport", () => {
    expect(parseFiche("Bonjour, voici un texte quelconque.")).toEqual({});
  });

  it("gere les heures decimales et l'annee scolaire ecrite", () => {
    const r = parseFiche("Annee 2026-2027\nDuree : 10,5 heures");
    expect(r.year).toBe(2026);
    expect(r.totalHours).toBe(10.5);
  });
});

describe("validateFicheHours", () => {
  it("valide une fiche coherente", () => {
    const result = validateFicheHours({
      hoursLecture: 10,
      hoursTd: 11,
      totalHours: 21,
    });
    expect(result.isValid).toBe(true);
    expect(result.calculatedTotal).toBe(21);
    expect(result.declaredTotal).toBe(21);
    expect(result.discrepancy).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it("detecte une incoherence", () => {
    const result = validateFicheHours({
      hoursLecture: 10,
      hoursTd: 11,
      totalHours: 20,
    });
    expect(result.isValid).toBe(false);
    expect(result.calculatedTotal).toBe(21);
    expect(result.declaredTotal).toBe(20);
    expect(result.discrepancy).toBe(1);
    expect(result.error).toContain("21h");
    expect(result.error).toContain("20h");
    expect(result.error).toContain("+1h");
  });

  it("tolere un ecart de 0.5h (arrondi)", () => {
    const result = validateFicheHours({
      hoursLecture: 10,
      hoursTd: 10.5,
      totalHours: 21,
    });
    expect(result.isValid).toBe(true);
    expect(result.calculatedTotal).toBe(20.5);
    expect(result.declaredTotal).toBe(21);
    expect(result.discrepancy).toBe(-0.5);
  });

  it("accepte si seul le total calcule est present", () => {
    const result = validateFicheHours({
      hoursLecture: 10,
      hoursTd: 11,
    });
    expect(result.isValid).toBe(true);
    expect(result.calculatedTotal).toBe(21);
    expect(result.declaredTotal).toBeNull();
  });

  it("accepte si seul le total declare est present", () => {
    const result = validateFicheHours({
      totalHours: 21,
    });
    expect(result.isValid).toBe(true);
    expect(result.calculatedTotal).toBeNull();
    expect(result.declaredTotal).toBe(21);
  });

  it("retourne isValid=true si aucun total", () => {
    const result = validateFicheHours({});
    expect(result.isValid).toBe(true);
    expect(result.calculatedTotal).toBeNull();
    expect(result.declaredTotal).toBeNull();
  });
});

describe("findInconsistentModules", () => {
  it("trouve les modules incoherents", () => {
    const modules = [
      {
        id: "1",
        name: "Module OK",
        ycode: "A2627_001",
        total_hours: 21,
        hours_lecture: 10,
        hours_td: 11,
        hours_tp: null,
      },
      {
        id: "2",
        name: "Module incoherent",
        ycode: "A2627_002",
        total_hours: 20,
        hours_lecture: 10,
        hours_td: 11,
        hours_tp: null,
      },
      {
        id: "3",
        name: "Module sans composantes",
        ycode: "A2627_003",
        total_hours: 21,
        hours_lecture: null,
        hours_td: null,
        hours_tp: null,
      },
    ];
    const result = findInconsistentModules(modules);
    expect(result.length).toBe(1);
    expect(result[0].moduleId).toBe("2");
    expect(result[0].moduleName).toBe("Module incoherent");
    expect(result[0].validation.isValid).toBe(false);
  });

  it("retourne une liste vide si tous les modules sont coherents", () => {
    const modules = [
      {
        id: "1",
        name: "Module OK 1",
        ycode: "A2627_001",
        total_hours: 21,
        hours_lecture: 10,
        hours_td: 11,
        hours_tp: null,
      },
      {
        id: "2",
        name: "Module OK 2",
        ycode: "A2627_002",
        total_hours: 20,
        hours_lecture: 10,
        hours_td: 10,
        hours_tp: null,
      },
    ];
    const result = findInconsistentModules(modules);
    expect(result.length).toBe(0);
  });
});
