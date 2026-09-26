import { describe, expect, it } from "vitest";

import { parseFiche } from "./fiche";

const FICHE = `FICHE PÉDAGOGIQUE
YNOV Campus Nantes
Intitulé du module : Méthodologies Agile & Scrum
Code module : A2627_4752
Mastère 1 Informatique
Volume horaire total : 21 h
FFP : 10 h
TDP : 11 h`;

describe("parseFiche", () => {
  it("extrait les champs d'une fiche complète", () => {
    expect(parseFiche(FICHE, ["YNOV Campus Nantes", "MyDigitalSchool"])).toEqual({
      name: "Méthodologies Agile & Scrum",
      ycode: "A2627_4752",
      year: 2026,
      level: "Mastère 1 Informatique",
      totalHours: 21,
      hoursLecture: 10,
      hoursTd: 11,
      schoolName: "YNOV Campus Nantes",
    });
  });

  it("déduit le total des sous-volumes quand il n'est pas indiqué", () => {
    const r = parseFiche("Module : Web\nCM 8 h\nTP 12 h");
    expect(r.totalHours).toBe(20);
    expect(r.hoursTp).toBe(12);
  });

  it("ne renvoie rien d'inventé sur un texte sans rapport", () => {
    expect(parseFiche("Bonjour, voici un texte quelconque.")).toEqual({});
  });

  it("gère les heures décimales et l'année scolaire écrite", () => {
    const r = parseFiche("Année 2026-2027\nDurée : 10,5 heures");
    expect(r.year).toBe(2026);
    expect(r.totalHours).toBe(10.5);
  });
});
