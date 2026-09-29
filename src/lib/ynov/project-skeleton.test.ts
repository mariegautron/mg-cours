import { describe, expect, it } from "vitest";

import { requiredNotes } from "./notation";
import { projectSkeleton, remainingSkeleton, skeletonBalance } from "./project-skeleton";

describe("projectSkeleton", () => {
  it("vide sans volume horaire", () => {
    expect(projectSkeleton(0)).toEqual([]);
    expect(projectSkeleton(Number.NaN)).toEqual([]);
  });

  it("2 notes (4-16 h) : oral + individuelle, aucun jalon", () => {
    expect(projectSkeleton(12).map((i) => i.role)).toEqual(["oral", "individual"]);
  });

  it("3 notes (20-48 h) : 1 jalon de groupe + oral + individuelle", () => {
    const s = projectSkeleton(21);
    expect(s.map((i) => [i.role, i.isGroupGrade])).toEqual([
      ["milestone", true],
      ["oral", true],
      ["individual", false],
    ]);
  });

  it("5 notes (52-70 h) : 2 jalons de groupe, 1 jalon individuel, oral, individuelle", () => {
    const s = projectSkeleton(60);
    expect(s.map((i) => [i.role, i.isGroupGrade])).toEqual([
      ["milestone", true],
      ["milestone", true],
      ["milestone", false],
      ["oral", true],
      ["individual", false],
    ]);
  });

  it.each([12, 21, 35, 48, 60, 70, 18, 90])("le total suit requiredNotes (%s h)", (h) => {
    const req = requiredNotes(h);
    const s = projectSkeleton(h);
    expect(s).toHaveLength(req.total);
    expect(s.filter((i) => i.isGroupGrade)).toHaveLength(req.group);
    expect(s.filter((i) => !i.isGroupGrade)).toHaveLength(req.individual);
  });

  it("numérote les jalons à partir de 1", () => {
    expect(
      projectSkeleton(60)
        .filter((i) => i.role === "milestone")
        .map((i) => i.title),
    ).toEqual(["Jalon 1", "Jalon 2", "Jalon 3"]);
  });
});

describe("remainingSkeleton", () => {
  it("retire ce qui existe déjà, rôle par rôle", () => {
    const rest = remainingSkeleton(projectSkeleton(60), ["milestone", "oral"]);
    expect(rest.map((i) => i.title)).toEqual(["Jalon 2", "Jalon 3", "Évaluation individuelle"]);
  });

  it("ne renvoie rien quand tout existe", () => {
    expect(remainingSkeleton(projectSkeleton(21), ["milestone", "oral", "individual"])).toEqual([]);
  });

  it("tout le squelette quand rien n'existe", () => {
    expect(remainingSkeleton(projectSkeleton(21), [])).toHaveLength(3);
  });
});

describe("skeletonBalance", () => {
  it("juste : pas de message", () => {
    const b = skeletonBalance(21, projectSkeleton(21));
    expect(b.matches).toBe(true);
    expect(b.message).toBeNull();
    expect(b.proposed).toEqual({ total: 3, group: 2, individual: 1 });
  });

  it("signale les évaluations manquantes", () => {
    const b = skeletonBalance(60, projectSkeleton(60).slice(0, 3));
    expect(b.matches).toBe(false);
    expect(b.message).toContain("Il manque 2 évaluations");
  });

  it("signale les évaluations en trop", () => {
    const b = skeletonBalance(21, [...projectSkeleton(21), { isGroupGrade: true }]);
    expect(b.message).toContain("1 évaluation en plus");
  });

  it("signale une répartition inhabituelle à total égal", () => {
    const b = skeletonBalance(21, [
      { isGroupGrade: false },
      { isGroupGrade: false },
      { isGroupGrade: true },
    ]);
    expect(b.matches).toBe(true);
    expect(b.message).toContain("Répartition inhabituelle");
  });

  it("volume inconnu", () => {
    expect(skeletonBalance(0, []).message).toContain("non renseigné");
  });
});
