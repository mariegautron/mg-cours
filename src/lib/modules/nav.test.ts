import { describe, expect, it } from "vitest";

import { activeModuleNav, moduleNavItems, moduleSectionLabel } from "./nav";
import { nextStepButton } from "./journey";
import type { ModuleSteps, ModuleStep } from "@/lib/ynov/module-steps";

describe("navigation du module", () => {
  it("six entrées dans l'ordre de la maquette", () => {
    expect(moduleNavItems("m1").map((i) => i.label)).toEqual([
      "Où j’en suis",
      "Séances",
      "Évaluations",
      "Étudiant·es",
      "Documents",
      "Facture",
    ]);
  });
  it("entrée courante déduite du chemin", () => {
    expect(activeModuleNav("/modules/m1/billing", "m1")).toBe("invoice");
    expect(activeModuleNav("/modules/m1/assessments/a2/quiz", "m1")).toBe("assessments");
    expect(activeModuleNav("/modules/m1/project", "m1")).toBe("assessments");
    expect(activeModuleNav("/modules/m1/courses/c1/notebook", "m1")).toBe("sessions");
    expect(activeModuleNav("/modules/m1/groups/g1", "m1")).toBe("students");
    expect(activeModuleNav("/modules/m1/expectations", "m1")).toBe("journey");
  });
  it("aucune entrée sur la fiche, sur Modifier ou hors du module", () => {
    expect(activeModuleNav("/modules/m1", "m1")).toBeNull();
    expect(activeModuleNav("/modules/m1/edit", "m1")).toBeNull();
    expect(activeModuleNav("/modules/m2/billing", "m1")).toBeNull();
    expect(moduleSectionLabel("/modules/m1", "m1")).toBeNull();
    expect(moduleSectionLabel("/modules/m1/edit", "m1")).toBe("Modifier");
  });
});

const step = {
  action: { label: "Saisir les notes", href: "/modules/m1/assessments" },
} as ModuleStep;

describe("bouton « Prochaine étape »", () => {
  it("libellé et lien de l'étape courante", () => {
    const j = { steps: [step], current: step, badge: "x" } as ModuleSteps;
    expect(nextStepButton(j)).toEqual({
      kind: "action",
      label: "Saisir les notes",
      href: "/modules/m1/assessments",
    });
  });
  it("« Tout est prêt » sans action quand le parcours est terminé", () => {
    const j = { steps: [step], current: null, badge: "Parcours terminé" } as ModuleSteps;
    expect(nextStepButton(j)).toEqual({ kind: "ready", label: "Tout est prêt" });
  });
  it("rien pour un module archivé", () => {
    expect(nextStepButton({ steps: [], current: null, badge: null })).toBeNull();
  });
});
