import { describe, expect, it } from "vitest";

import { assessmentSchema, gridSchema, readAssessmentForm, readGridForm } from "./schema";

describe("gridSchema", () => {
  it("exige un nom et un JSON de critères non vide", () => {
    const fd = new FormData();
    fd.set("name", "");
    fd.set("criteriaJson", "");
    const parsed = readGridForm(fd);
    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.name).toEqual(["Le nom est obligatoire."]);
    expect(parsed.error?.flatten().fieldErrors.criteriaJson).toEqual([
      "Ajoute au moins un critère.",
    ]);
  });

  it("lit confirmDeleteCriteria depuis le champ caché", () => {
    const fd = new FormData();
    fd.set("name", "Grille");
    fd.set("criteriaJson", "[]");
    fd.set("confirmDeleteCriteria", "1");
    const parsed = gridSchema.safeParse({
      name: "Grille",
      description: "",
      criteriaJson: "[]",
      confirmDeleteCriteria: true,
    });
    expect(parsed.success && parsed.data.confirmDeleteCriteria).toBe(true);
  });
});

describe("readAssessmentForm", () => {
  const G1 = "11111111-1111-4111-8111-111111111111";
  const G2 = "22222222-2222-4222-8222-222222222222";
  const form = (groupIds: string[]) => {
    const fd = new FormData();
    fd.set("title", "TP noté");
    for (const id of groupIds) fd.append("studentGroupIds", id);
    return fd;
  };

  it("accepte plusieurs groupes et retire les doublons", () => {
    const parsed = readAssessmentForm(form([G1, G2, G1]));
    expect(parsed.success && parsed.data.studentGroupIds).toEqual([G1, G2]);
  });

  it("accepte aucun groupe : le serveur l'exige seulement si le module en a", () => {
    const parsed = readAssessmentForm(form([]));
    expect(parsed.success && parsed.data.studentGroupIds).toEqual([]);
  });

  it("barème : vide → null, décimal accepté (virgule ou point), zéro refusé", () => {
    const withMax = (v: string) => {
      const fd = form([G1]);
      fd.set("maxScore", v);
      return readAssessmentForm(fd);
    };
    const empty = withMax("");
    expect(empty.success && empty.data.maxScore).toBeNull();
    const comma = withMax("24,5");
    expect(comma.success && comma.data.maxScore).toBe(24.5);
    const zero = withMax("0");
    expect(zero.success).toBe(false);
    expect(zero.error?.flatten().fieldErrors.maxScore).toEqual([
      "Le barème doit être supérieur à 0.",
    ]);
  });
});

describe("assessmentSchema — sujet", () => {
  const base = { title: "Oral", studentGroupIds: ["00000000-0000-4000-8000-000000000000"] };

  it("accepte un sujet Markdown jusqu'à 20 000 caractères", () => {
    expect(assessmentSchema.safeParse({ ...base, subject: "a".repeat(20000) }).success).toBe(true);
  });

  it("refuse un sujet au-delà de 20 000 caractères", () => {
    const parsed = assessmentSchema.safeParse({ ...base, subject: "a".repeat(20001) });
    expect(parsed.success).toBe(false);
  });
});

describe("readAssessmentForm — sujet (US-90)", () => {
  const G1 = "11111111-1111-4111-8111-111111111111";
  const C1 = "33333333-3333-4333-8333-333333333333";
  const form = (extra: Record<string, string>) => {
    const fd = new FormData();
    fd.set("title", "Évaluation individuelle");
    fd.append("studentGroupIds", G1);
    for (const [k, v] of Object.entries(extra)) fd.set(k, v);
    return fd;
  };

  it("champs du sujet vides → null, état « à construire » par défaut", () => {
    const parsed = readAssessmentForm(form({}));
    expect(parsed.success && parsed.data).toMatchObject({
      objective: null,
      deliverableMd: null,
      evaluatedMd: null,
      courseId: null,
      prepStatus: "to_build",
    });
  });

  it("lit séance, objectif, rendu, évalué et état", () => {
    const parsed = readAssessmentForm(
      form({
        objective: " Corriger un extrait ",
        deliverableMd: "Code corrigé",
        evaluatedMd: "Pertinence",
        courseId: C1,
        prepStatus: "ready",
      }),
    );
    expect(parsed.success && parsed.data).toMatchObject({
      objective: "Corriger un extrait",
      courseId: C1,
      prepStatus: "ready",
    });
  });

  it("refuse un état inconnu ou une séance qui n'est pas un identifiant", () => {
    expect(readAssessmentForm(form({ prepStatus: "done" })).success).toBe(false);
    expect(readAssessmentForm(form({ courseId: "abc" })).success).toBe(false);
  });
});
