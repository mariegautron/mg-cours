import { describe, expect, it } from "vitest";

import type { ModuleSteps } from "@/lib/ynov/module-steps";

import { completionLines, moduleStage } from "./completion";

const step = {
  key: "fiche",
  number: 1,
  title: "t",
  state: "done",
  summary: "",
  action: { label: "", href: "" },
  badge: "",
} as const;
const done: ModuleSteps = { steps: [step], current: null, badge: "Parcours terminé" };
const doing: ModuleSteps = { steps: [step], current: { ...step, state: "todo" }, badge: "x" };
const archived: ModuleSteps = { steps: [], current: null, badge: null };

describe("moduleStage", () => {
  it("terminé quand rangé, prêt quand toutes les étapes sont faites, sinon en cours", () => {
    expect(moduleStage(archived, true)).toBe("finished");
    expect(moduleStage(done, false)).toBe("all_ready");
    expect(moduleStage(doing, false)).toBe("in_progress");
  });
  it("sans étape (module archivé non rangé ?) : jamais « tout est prêt »", () => {
    expect(moduleStage(archived, false)).toBe("in_progress");
  });
});

describe("completionLines", () => {
  it("résumé chiffré dans l'ordre", () => {
    expect(
      completionLines({
        courses: { total: 6, done: 6 },
        notes: { entered: 3, required: 3 },
        invoice: "paid",
        totalHours: 21,
      }),
    ).toEqual([
      "6 séances sur 6 faites",
      "3 notes saisies (3 exigées)",
      "21 heures",
      "facture payée",
    ]);
  });
  it("singulier, vide, sans facture", () => {
    expect(
      completionLines({
        courses: { total: 1, done: 1 },
        notes: { entered: 1, required: 1 },
        invoice: null,
        totalHours: null,
      }),
    ).toEqual(["1 séance sur 1 faite", "1 note saisie (1 exigée)"]);
    expect(
      completionLines({
        courses: { total: 0, done: 0 },
        notes: { entered: 0, required: 0 },
        invoice: "sent",
        totalHours: 0,
      }),
    ).toEqual(["facture envoyée"]);
  });
});
