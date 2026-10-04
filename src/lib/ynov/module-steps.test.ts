import { describe, expect, it } from "vitest";

import { coverageSummary, moduleSteps, type ModuleStepsContext } from "./module-steps";

const empty: ModuleStepsContext = {
  moduleId: "m1",
  archived: false,
  hasFiche: false,
  expectationsCount: 0,
  coverage: { covered: 0, toBuild: 0, uncovered: 0, total: 0 },
  courses: { total: 0, ready: 0, done: 0 },
  outlineGeneratedAt: null,
  outlineSent: false,
  outlineDueDate: null,
  notes: { entered: 0, required: 3, satisfied: false },
  plannedAssessments: 0,
  adminDocs: { done: 0, total: 4 },
  invoice: null,
  billingReady: false,
};

const states = (ctx: ModuleStepsContext) => moduleSteps(ctx).steps.map((s) => s.state);
const keyed = (ctx: ModuleStepsContext, key: string) =>
  moduleSteps(ctx).steps.find((s) => s.key === key)!;

describe("moduleSteps — module vide", () => {
  const r = moduleSteps(empty);
  it("10 étapes numérotées dans l'ordre, toutes à faire", () => {
    expect(r.steps.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(r.steps.map((s) => s.key)).toEqual([
      "fiche",
      "matching",
      "sessions",
      "planning",
      "outline",
      "send",
      "teach",
      "assess",
      "admin",
      "invoice",
    ]);
    expect(states(empty).every((s) => s === "todo")).toBe(true);
  });
  it("prochaine étape : lire les attendus", () => {
    expect(r.current?.key).toBe("fiche");
    expect(r.badge).toBe("Prochaine étape : lire les attendus de la fiche");
    expect(r.current?.action).toEqual({
      label: "Lire les attendus de la fiche",
      href: "/modules/m1/expectations",
    });
  });
  it("résumés d'un module vide", () => {
    expect(keyed(empty, "fiche").summary).toBe("aucune fiche déposée");
    expect(keyed(empty, "sessions").summary).toBe("aucune séance");
    expect(keyed(empty, "sessions").action.label).toBe("Créer les séances");
    expect(keyed(empty, "send").summary).toBe("date de la 1re séance à renseigner");
    expect(keyed(empty, "send").action.href).toBe("/modules/m1/edit");
    expect(keyed(empty, "teach").summary).toBe("0/0 faites");
    expect(keyed(empty, "assess").summary).toBe("0/3 notes");
    expect(keyed(empty, "admin").summary).toBe("0/4");
  });
});

describe("moduleSteps — fiche seule", () => {
  it("fiche déposée sans attendus : étape 1 en cours", () => {
    const ctx = { ...empty, hasFiche: true };
    const r = moduleSteps(ctx);
    expect(r.steps[0].state).toBe("in_progress");
    expect(r.steps[0].summary).toBe("fiche déposée, attendus à lire");
    expect(r.current?.key).toBe("fiche");
  });
  it("fiche + attendus : étape 1 faite, on passe au rapprochement", () => {
    const ctx = { ...empty, hasFiche: true, expectationsCount: 6 };
    const r = moduleSteps(ctx);
    expect(r.steps[0].state).toBe("done");
    expect(r.steps[0].summary).toBe("6 attendus");
    expect(r.current?.key).toBe("matching");
    expect(r.current?.action.label).toBe("Rapprocher mes ressources");
    expect(r.badge).toBe("Prochaine étape : rapprocher les ressources des attendus");
  });
  it("attendus saisis sans fiche déposée : pas encore fait", () => {
    expect(moduleSteps({ ...empty, expectationsCount: 2 }).steps[0].state).toBe("in_progress");
  });
  it("un seul attendu : singulier", () => {
    expect(keyed({ ...empty, hasFiche: true, expectationsCount: 1 }, "fiche").summary).toBe(
      "1 attendu",
    );
  });
});

describe("moduleSteps — rapprochement", () => {
  const withExpectations = { ...empty, hasFiche: true, expectationsCount: 6 };
  it("en cours tant qu'un attendu n'a rien", () => {
    const ctx = {
      ...withExpectations,
      coverage: { covered: 4, toBuild: 1, uncovered: 1, total: 6 },
    };
    const step = keyed(ctx, "matching");
    expect(step.state).toBe("in_progress");
    expect(step.summary).toBe("4 couverts, 1 à construire, 1 sans ressource");
  });
  it("fait quand chaque attendu est couvert ou à construire", () => {
    const ctx = {
      ...withExpectations,
      coverage: { covered: 4, toBuild: 2, uncovered: 0, total: 6 },
    };
    const step = keyed(ctx, "matching");
    expect(step.state).toBe("done");
    expect(step.summary).toBe("4 couverts, 2 à construire");
    expect(moduleSteps(ctx).current?.key).toBe("sessions");
  });
  it("coverageSummary : singulier", () => {
    expect(coverageSummary({ covered: 1, toBuild: 0, uncovered: 0, total: 1 })).toBe("1 couvert");
  });
});

describe("moduleSteps — séances", () => {
  const base = {
    ...empty,
    hasFiche: true,
    expectationsCount: 6,
    coverage: { covered: 6, toBuild: 0, uncovered: 0, total: 6 },
  };
  it("séances non prêtes : en cours, action préparer", () => {
    const ctx = { ...base, courses: { total: 6, ready: 0, done: 0 } };
    const step = keyed(ctx, "sessions");
    expect(step.state).toBe("in_progress");
    expect(step.summary).toBe("6 séances, 0 prête");
    expect(step.action.label).toBe("Préparer mes séances");
    expect(moduleSteps(ctx).current?.key).toBe("sessions");
  });
  it("au moins une séance prête : fait", () => {
    const ctx = { ...base, courses: { total: 6, ready: 2, done: 0 } };
    expect(keyed(ctx, "sessions").state).toBe("done");
    expect(keyed(ctx, "sessions").summary).toBe("6 séances, 2 prêtes");
    expect(moduleSteps(ctx).current?.key).toBe("planning");
  });
});

describe("moduleSteps — évaluations prévues", () => {
  const base = {
    ...empty,
    courses: { total: 6, ready: 2, done: 0 },
    hasFiche: true,
    expectationsCount: 6,
    coverage: { covered: 6, toBuild: 0, uncovered: 0, total: 6 },
  };
  it("aucune évaluation prévue : à faire, « 0 / 3 notes prévues »", () => {
    const step = keyed(base, "planning");
    expect(step.state).toBe("todo");
    expect(step.summary).toBe("0 / 3 notes prévues");
    expect(step.action.href).toBe("/modules/m1/assessments");
  });
  it("partiellement prévues : en cours", () => {
    expect(keyed({ ...base, plannedAssessments: 2 }, "planning").state).toBe("in_progress");
  });
  it("toutes prévues : fait, on passe à la progression", () => {
    const ctx = { ...base, plannedAssessments: 3 };
    expect(keyed(ctx, "planning").state).toBe("done");
    expect(moduleSteps(ctx).current?.key).toBe("outline");
  });
});

describe("moduleSteps — progression générée puis envoyée", () => {
  const base = {
    ...empty,
    hasFiche: true,
    expectationsCount: 6,
    coverage: { covered: 6, toBuild: 0, uncovered: 0, total: 6 },
    courses: { total: 6, ready: 6, done: 0 },
    plannedAssessments: 3,
  };
  it("générée, pas envoyée : échéance affichée, envoi à faire", () => {
    const ctx = {
      ...base,
      outlineGeneratedAt: "2026-09-20T10:00:00Z",
      outlineDueDate: "2026-09-27T00:00:00Z",
    };
    expect(keyed(ctx, "outline").state).toBe("done");
    expect(keyed(ctx, "outline").summary).toBe("générée le 20/09/2026");
    const send = keyed(ctx, "send");
    expect(send.state).toBe("todo");
    expect(send.summary).toBe("à envoyer avant le 27/09/2026");
    expect(send.action).toEqual({ label: "Envoyer la progression", href: "/modules/m1/outline" });
    expect(moduleSteps(ctx).current?.key).toBe("send");
  });
  it("envoyée : on passe à faire cours", () => {
    const ctx = { ...base, outlineGeneratedAt: "2026-09-20T10:00:00Z", outlineSent: true };
    expect(keyed(ctx, "send").state).toBe("done");
    expect(keyed(ctx, "send").summary).toBe("envoyée");
    const r = moduleSteps(ctx);
    expect(r.current?.key).toBe("teach");
    expect(r.badge).toBe("Prochaine étape : faire cours");
  });
});

describe("moduleSteps — cours, notes, documents, facture", () => {
  const sent = {
    ...empty,
    outlineSent: true,
    courses: { total: 6, ready: 6, done: 3 },
    notes: { entered: 1, required: 3, satisfied: false },
    adminDocs: { done: 2, total: 4 },
  };
  it("cours en cours : 3/6 faites", () => {
    expect(keyed(sent, "teach").state).toBe("in_progress");
    expect(keyed(sent, "teach").summary).toBe("3/6 faites");
  });
  it("toutes les séances faites : étape faite", () => {
    expect(keyed({ ...sent, courses: { total: 6, ready: 6, done: 6 } }, "teach").state).toBe(
      "done",
    );
  });
  it("notes et documents en cours", () => {
    expect(keyed(sent, "assess").state).toBe("in_progress");
    expect(keyed(sent, "assess").summary).toBe("1/3 notes");
    expect(keyed(sent, "admin").state).toBe("in_progress");
    expect(keyed(sent, "admin").summary).toBe("2/4");
  });
  it("notes exigées saisies : évaluer fait", () => {
    const ctx = { ...sent, notes: { entered: 3, required: 3, satisfied: true } };
    expect(keyed(ctx, "assess").state).toBe("done");
  });
  it("facture : blocages, à générer, à envoyer, envoyée, payée", () => {
    expect(keyed(sent, "invoice").summary).toBe("blocages à lever avant la facture");
    expect(keyed({ ...sent, billingReady: true }, "invoice").action.label).toBe(
      "Générer la facture",
    );
    expect(keyed({ ...sent, invoice: "draft" }, "invoice").state).toBe("in_progress");
    expect(keyed({ ...sent, invoice: "ready" }, "invoice").action.label).toBe("Envoyer la facture");
    const s = keyed({ ...sent, invoice: "sent" }, "invoice");
    expect(s.state).toBe("waiting");
    expect(s.action.label).toBe("Suivre le paiement");
  });
  it("facture envoyée : c'est la prochaine étape (en attente)", () => {
    const r = moduleSteps({ ...sent, invoice: "sent" });
    expect(r.current?.key).toBe("invoice");
    expect(r.badge).toBe("Prochaine étape : suivre le paiement de la facture");
  });
  it("facture payée : parcours terminé", () => {
    const r = moduleSteps({ ...sent, invoice: "paid" });
    expect(r.steps.every((s) => s.state === "done")).toBe(true);
    expect(r.current).toBeNull();
    expect(r.badge).toBe("Parcours terminé");
  });
});

describe("moduleSteps — module déjà réalisé", () => {
  it("progression déposée sur un module vide : préparation validée d'office", () => {
    const ctx = { ...empty, outlineSent: true };
    expect(states(ctx).slice(0, 6)).toEqual(["done", "done", "done", "done", "done", "done"]);
    expect(states(ctx).slice(6)).toEqual(["todo", "todo", "todo", "todo"]);
    expect(moduleSteps(ctx).current?.key).toBe("teach");
  });
  it("facture émise : toutes les étapes avant la facture sont validées", () => {
    const ctx = { ...empty, invoice: "sent" as const };
    expect(
      states(ctx)
        .slice(0, 8)
        .every((s) => s === "done"),
    ).toBe(true);
    expect(moduleSteps(ctx).current?.key).toBe("invoice");
  });
});

describe("moduleSteps — module archivé", () => {
  it("garde les dix étapes, sans prochaine étape", () => {
    const r = moduleSteps({ ...empty, archived: true, outlineSent: true });
    expect(r.steps).toHaveLength(10);
    expect(r.current).toBeNull();
    expect(r.badge).toBeNull();
    expect(r.steps.every((s) => s.action.href.startsWith("/"))).toBe(true);
  });
});

describe("moduleSteps — liens d'action", () => {
  it("un lien par étape, dans le module", () => {
    for (const s of moduleSteps(empty).steps) {
      expect(s.action.label.length).toBeGreaterThan(0);
      expect(s.action.href).toMatch(/^\/(modules|present\/modules)\/m1/);
    }
  });
});
