import { describe, expect, it } from "vitest";

import { cadreBlocks, deliverableItems, longDay, type CadreInput } from "./cadre";

const base: CadreInput = {
  title: "Jalon 1",
  objective: "Constituer et prioriser le backlog du client",
  date: "2026-11-02",
  sessionNumber: 3,
  startTime: null,
  isGroupGrade: true,
  deliverableMd: "- Un backlog priorisé (PDF ou lien)\n- Vos estimations",
  maxScore: 20,
  hasGrid: true,
};

describe("cadre projeté", () => {
  it("« Où » n'apparaît que s'il est renseigné", () => {
    expect(cadreBlocks(base).some((b) => b.key === "where")).toBe(false);
    const blocks = cadreBlocks({ ...base, whereToSubmit: "  Moodle, section Projet " });
    expect(blocks.map((b) => b.key)).toEqual(["when", "who", "where", "deliver", "graded"]);
    expect(blocks[2]).toMatchObject({ label: "Où", value: "Moodle, section Projet" });
  });

  it("date en toutes lettres", () => {
    expect(longDay("2026-11-02")).toBe("Lundi 2 novembre");
  });

  it("quatre blocs : quand, avec qui, rendu, notation", () => {
    const blocks = cadreBlocks(base);
    expect(blocks.map((b) => b.key)).toEqual(["when", "who", "deliver", "graded"]);
    expect(blocks[0]).toMatchObject({ value: "Lundi 2 novembre", sub: "séance 3" });
    expect(blocks[1]).toMatchObject({ value: "En groupe", sub: "votre groupe de projet" });
    expect(blocks[2].value).toBe("Un backlog priorisé (PDF ou lien) · Vos estimations");
    expect(blocks[3]).toMatchObject({
      value: "Note de groupe, sur 20",
      sub: "Grille sur la diapositive suivante",
    });
  });

  it("heure de passage, individuel, sans rendu ni grille", () => {
    const blocks = cadreBlocks({
      ...base,
      date: null,
      startTime: "14:30:00",
      isGroupGrade: false,
      deliverableMd: null,
      hasGrid: false,
    });
    expect(blocks.map((b) => b.key)).toEqual(["when", "who", "graded"]);
    expect(blocks[0]).toMatchObject({ value: "Date à venir", sub: "à 14h30" });
    expect(blocks[1].value).toBe("Seul·e");
    expect(blocks[2]).toMatchObject({ value: "Note individuelle, sur 20", sub: null });
  });

  it("au plus trois éléments de rendu", () => {
    expect(deliverableItems("a\nb\nc\nd")).toEqual(["a", "b", "c"]);
    expect(deliverableItems(null)).toEqual([]);
  });
});
