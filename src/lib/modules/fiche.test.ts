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

  it("ne déborde pas sur la ligne suivante pour le niveau", () => {
    expect(parseFiche("Bachelor 3\nVolume horaire : 12 h").level).toBe("Bachelor 3");
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

describe("parseFiche — fiche YNOV réelle (US-79)", () => {
  const YNOV = `FICHE PÉDAGOGIQUE
Nom long Analyse des Besoins & Faisabilité Technique
Niveau Mastère 1
Volume heures totales
FFP TDP
28h 10h 18h
Unités pédagogiques
1 FFP 3h Cadrage du besoin
2 TDP 4h Étude de faisabilité
3 FFP 3h Restitution total 6h`;

  it("lit le nom long, le niveau et le total de 28 h", () => {
    const r = parseFiche(YNOV);
    expect(r.name).toBe("Analyse des Besoins & Faisabilité Technique");
    expect(r.level).toBe("Mastère 1");
    expect(r.totalHours).toBe(28);
  });

  it("garde FFP et TDP de l'en-tête, jamais ceux du tableau des unités", () => {
    const r = parseFiche(YNOV);
    expect(r.hoursLecture).toBe(10);
    expect(r.hoursTd).toBe(18);
  });

  it("ne lit jamais le total dans le tableau des unités pédagogiques", () => {
    const r = parseFiche("Nom long Web\nUnités pédagogiques\n1 FFP 3h Intro total 6h\n2 TDP 4h TP");
    expect(r.totalHours).toBeUndefined();
    expect(r.hoursLecture).toBeUndefined();
    expect(r.hoursTd).toBeUndefined();
  });

  it("accepte un texte sans retour à la ligne (PDF fusionné)", () => {
    const r = parseFiche(
      "Nom long Analyse des Besoins & Faisabilité Technique Niveau Mastère 1 Volume heures totales FFP TDP 28h 10h 18h Unités pédagogiques 1 FFP 3h",
    );
    expect(r).toMatchObject({
      name: "Analyse des Besoins & Faisabilité Technique",
      level: "Mastère 1",
      totalHours: 28,
      hoursLecture: 10,
      hoursTd: 18,
    });
  });

  it("FFP et TDP sont facultatifs : seul le total compte", () => {
    const r = parseFiche("Nom long Gestion de projet\nVolume heures totales\n21h");
    expect(r).toEqual({ name: "Gestion de projet", totalHours: 21 });
  });

  it("n'attribue pas les colonnes quand le nombre de valeurs ne correspond pas", () => {
    const r = parseFiche("Volume heures totales FFP TDP\n28h 10h");
    expect(r.totalHours).toBe(28);
    expect(r.hoursLecture).toBeUndefined();
    expect(r.hoursTd).toBeUndefined();
  });

  it("n'accepte un niveau libellé que s'il ressemble à un niveau", () => {
    expect(parseFiche("Niveau de difficulté élevé").level).toBeUndefined();
  });
});
