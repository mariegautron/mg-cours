import { describe, expect, it } from "vitest";

import type { ModuleStep, ModuleSteps, StepKey, StepState } from "@/lib/ynov/module-steps";

import { buildHero, isLater, shortDay, stepSubtitle } from "./hero";

const KEYS: StepKey[] = [
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
];

function journey(states: StepState[]): ModuleSteps {
  const steps: ModuleStep[] = KEYS.map((key, i) => ({
    key,
    number: i + 1,
    title: key,
    state: states[i] ?? "todo",
    summary: `résumé ${key}`,
    action: { label: `Action ${key}`, href: `/modules/m1/${key}` },
    badge: key,
  }));
  const current = steps.find((s) => s.state !== "done") ?? null;
  return {
    steps,
    current,
    badge: current ? `Prochaine étape : ${current.badge}` : "Parcours terminé",
  };
}

const base = {
  moduleId: "m1",
  firstSessionDate: "2026-10-12",
  firstCourse: { id: "c1", position: 1 },
  courses: { total: 6, done: 0 },
  closed: false,
};

describe("buildHero", () => {
  it("étape courante : titre, texte, bouton principal et « passer »", () => {
    const h = buildHero({ ...base, journey: journey(["done"]) })!;
    expect(h.kind).toBe("step");
    expect(h.eyebrow).toBe("Prochaine étape · 2 sur 10");
    expect(h.title).toBe("Rapprocher tes ressources des attendus");
    expect(h.primary).toEqual({ label: "Action matching →", href: "/modules/m1/matching" });
    expect(h.secondary?.label).toBe("Passer aux séances");
    expect(h.secondary?.href).toBe("/modules/m1/sessions");
  });
  it("tout est préparé : « Tout est prêt pour le 12/10 »", () => {
    const h = buildHero({
      ...base,
      journey: journey(["done", "done", "done", "done", "done", "done"]),
    })!;
    expect(h.kind).toBe("ready");
    expect(h.title).toBe("Tout est prêt pour le 12/10");
    expect(h.primary?.label).toBe("Voir la séance 1");
    expect(h.secondary?.label).toBe("Préparer les groupes");
  });
  it("une fois les cours commencés, retour à l'étape normale", () => {
    const h = buildHero({
      ...base,
      courses: { total: 6, done: 2 },
      journey: journey(["done", "done", "done", "done", "done", "done"]),
    })!;
    expect(h.kind).toBe("step");
    expect(h.title).toBe("Faire cours");
  });
  it("dix étapes faites : module terminé, bouton de rangement", () => {
    const h = buildHero({ ...base, journey: journey(Array(10).fill("done")) })!;
    expect(h.kind).toBe("finished");
    expect(h.title).toBe("Ce module est terminé");
    expect(h.offerFinish).toBe(true);
  });
  it("module terminé ou rangé : pas de bouton de rangement", () => {
    const h = buildHero({ ...base, closed: true, journey: journey([]) })!;
    expect(h.kind).toBe("finished");
    expect(h.offerFinish).toBe(false);
  });
  it("sans étape (module vide) et pas fermé : rien", () => {
    expect(buildHero({ ...base, journey: { steps: [], current: null, badge: null } })).toBeNull();
  });
});

describe("liste des étapes", () => {
  it("estompe les étapes d'après la préparation, jamais l'étape courante ni les faites", () => {
    expect(isLater({ key: "assess", state: "todo" }, "matching")).toBe(true);
    expect(isLater({ key: "teach", state: "todo" }, "teach")).toBe(false);
    expect(isLater({ key: "admin", state: "done" }, "matching")).toBe(false);
    expect(isLater({ key: "sessions", state: "todo" }, "matching")).toBe(false);
  });
  it("sous-titres et dates", () => {
    expect(stepSubtitle({ state: "done", summary: "6 attendus" })).toBe("Fait · 6 attendus");
    expect(stepSubtitle({ state: "todo", summary: "0 couvert sur 6" })).toBe("0 couvert sur 6");
    expect(shortDay("2026-10-12")).toBe("12/10");
  });
});
