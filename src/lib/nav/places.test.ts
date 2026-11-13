import { describe, expect, it } from "vitest";

import { placeOf, sameSectionIn, tabsOf } from "./places";

const ROUTES = [
  "/dashboard",
  "/assessments",
  "/assessments/grids",
  "/assessments/grids/g1/edit",
  "/assessments/comments",
  "/resources",
  "/resources/r1/edit",
  "/questions",
  "/students",
  "/students/s1",
  "/billing",
  "/settings",
  "/modules",
  "/modules/new",
  "/modules/m1",
  "/modules/m1/courses",
  "/modules/m1/courses/c1",
  "/modules/m1/planning",
  "/modules/m1/schedule",
  "/modules/m1/assessments/a1/correct",
  "/modules/m1/project",
  "/modules/m1/rattrapages",
  "/modules/m1/groups/wizard",
  "/modules/m1/appreciations",
  "/modules/m1/frise",
  "/modules/m1/apercu/s1",
  "/modules/m1/expectations",
  "/modules/m1/outline",
  "/modules/m1/feedback",
  "/modules/m1/documents",
  "/modules/m1/billing",
  "/modules/m1/finish",
];

describe("table de navigation", () => {
  it("chaque route a une place", () => {
    for (const r of ROUTES) expect(placeOf(r), r).not.toBeNull();
  });
  it("une grille allume Bibliothèque › Grilles", () => {
    expect(placeOf("/assessments/grids/g1/edit")).toMatchObject({ menu: "library", tab: "grids" });
  });
  it("l'agenda des évaluations est un onglet d'Aujourd'hui", () => {
    expect(placeOf("/assessments")).toMatchObject({ menu: "dashboard", tab: "agenda" });
  });
  it("Planning allume Séances › Planning ; Appréciations allume Classe", () => {
    expect(placeOf("/modules/m1/planning")).toMatchObject({
      moduleEntry: "sessions",
      tab: "planning",
    });
    expect(placeOf("/modules/m1/appreciations")).toMatchObject({ moduleEntry: "class" });
  });
  it("onglets de la place", () => {
    expect(tabsOf(placeOf("/questions")!).map((t) => t.key)).toEqual([
      "resources",
      "questions",
      "grids",
      "phrases",
    ]);
  });
  it("changer de module garde la section", () => {
    expect(sameSectionIn("/modules/m1/rattrapages", "m2")).toBe("/modules/m2/rattrapages");
    expect(sameSectionIn("/modules/m1/courses/c1", "m2")).toBe("/modules/m2/courses");
    expect(sameSectionIn("/dashboard", "m2")).toBe("/modules/m2");
  });
  it("hors de l'appli : pas de place", () => {
    expect(placeOf("/espace/abc")).toBeNull();
  });
});
