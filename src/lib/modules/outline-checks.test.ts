import { describe, expect, it } from "vitest";

import {
  deadlineBanner,
  formatNumbers,
  isPlaceholderTitle,
  outlineChecks,
  type OutlineCourse,
} from "./outline-checks";

const course = (over: Partial<OutlineCourse> = {}): OutlineCourse => ({
  position: 0,
  title: "Cadrage",
  sessionDate: "2026-10-12",
  startTime: "08:00",
  endTime: "11:00",
  objectives: ["Cadrer un besoin"],
  contentUpdatedAt: "2026-09-01",
  ...over,
});

describe("titres et numéros", () => {
  it("reconnaît un titre par défaut", () => {
    expect(isPlaceholderTitle("Séance 4")).toBe(true);
    expect(isPlaceholderTitle("  séance 12 ")).toBe(true);
    expect(isPlaceholderTitle("")).toBe(true);
    expect(isPlaceholderTitle("Séance de cadrage")).toBe(false);
  });
  it("formule la liste des séances", () => {
    expect(formatNumbers([1])).toBe("Séance 1");
    expect(formatNumbers([4, 1])).toBe("Séances 1 et 4");
    expect(formatNumbers([1, 4, 6])).toBe("Séances 1, 4 et 6");
    expect(formatNumbers([])).toBe("");
  });
});

describe("outlineChecks", () => {
  const base = {
    moduleHours: 6,
    assessments: { total: 2, linked: 2 },
    expectations: { total: 3, uncovered: 0 },
  };

  it("tout est prêt", () => {
    const checks = outlineChecks({ ...base, courses: [course(), course({ title: "Atelier" })] });
    expect(checks.every((c) => c.ok)).toBe(true);
    expect(checks[0]).toMatchObject({ title: "2 séances datées", detail: "6 h sur 6 h du module" });
  });

  it("signale les séances sans titre, sans objectifs, sans date, et les attendus non couverts", () => {
    const checks = outlineChecks({
      ...base,
      assessments: { total: 3, linked: 1 },
      expectations: { total: 3, uncovered: 2 },
      courses: [
        course({ title: "Séance 1", objectives: [] }),
        course({ title: "Atelier", sessionDate: null }),
        course({ title: "Séance 3", contentUpdatedAt: null }),
      ],
    });
    const byKey = Object.fromEntries(checks.map((c) => [c.key, c]));
    expect(byKey.dated).toMatchObject({
      ok: false,
      title: "1 séance sans date",
      detail: "Séance 2",
    });
    expect(byKey.titles).toMatchObject({ ok: false, detail: "Séances 1 et 3" });
    expect(byKey.goals).toMatchObject({ ok: false, title: "1 séance sans objectifs" });
    expect(byKey.updated.ok).toBe(false);
    expect(byKey.assessments).toMatchObject({
      ok: false,
      title: "2 évaluations à rattacher à une séance",
    });
    expect(byKey.expectations).toMatchObject({ ok: false, title: "2 attendus non couverts" });
  });

  it("sans séance ni attendu : on le dit, rien ne bloque", () => {
    const checks = outlineChecks({
      courses: [],
      moduleHours: 0,
      assessments: { total: 0, linked: 0 },
      expectations: { total: 0, uncovered: 0 },
    });
    expect(checks.map((c) => c.key)).toEqual(["dated", "assessments", "expectations"]);
    expect(checks.every((c) => !c.ok)).toBe(true);
  });
});

describe("deadlineBanner", () => {
  it("dépassée, à venir, inconnue, envoyée", () => {
    expect(deadlineBanner("overdue", -2, "27/09/2026")).toMatchObject({
      strong: "Échéance : 27/09/2026, dépassée de 2 jours.",
      tone: "warn",
    });
    expect(deadlineBanner("warning", 5, "27/09/2026")?.strong).toBe(
      "Échéance : 27/09/2026, dans 5 jours.",
    );
    expect(deadlineBanner("unknown", null, null)?.tone).toBe("info");
    expect(deadlineBanner("sent", null, null)).toBeNull();
  });
});
