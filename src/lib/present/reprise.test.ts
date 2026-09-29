import { describe, expect, it } from "vitest";

import { previousNextTime, repriseLines } from "./reprise";

describe("repriseLines", () => {
  it("une ligne = un point, puces retirées, vides ignorées", () => {
    expect(
      repriseLines("- Lire le Scrum Guide\n\n2) Préparer les questions\n  •  Un dernier  point "),
    ).toEqual(["Lire le Scrum Guide", "Préparer les questions", "Un dernier point"]);
  });

  it("gère le vide et limite la longueur", () => {
    expect(repriseLines(null)).toEqual([]);
    expect(repriseLines("   \n ")).toEqual([]);
    expect(
      repriseLines(Array.from({ length: 30 }, (_, i) => `Point ${i}`).join("\n")),
    ).toHaveLength(12);
  });
});

describe("previousNextTime", () => {
  const courses = [
    { next_time: "Lire le chapitre 1" },
    { next_time: null },
    { next_time: "Rendre le TP" },
  ];

  it("reprend la consigne de la séance précédente", () => {
    expect(previousNextTime(courses, 1)).toEqual(["Lire le chapitre 1"]);
    expect(previousNextTime(courses, 3)).toEqual(["Rendre le TP"]);
  });

  it("rien pour la première séance ni si la précédente n'a pas de consigne", () => {
    expect(previousNextTime(courses, 0)).toEqual([]);
    expect(previousNextTime(courses, 2)).toEqual([]);
  });
});
