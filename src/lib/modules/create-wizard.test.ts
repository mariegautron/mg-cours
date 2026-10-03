import { describe, expect, it } from "vitest";

import {
  createButtonLabel,
  hoursBalance,
  mergePlanned,
  originLabel,
  progressionDeadline,
  slotsInSession,
} from "./create-wizard";

describe("mergePlanned", () => {
  it("trie séances importées et lignes à la main par date puis heure", () => {
    const merged = mergePlanned(
      [{ date: "2026-11-02", startTime: "08:00", endTime: "12:00" }],
      [
        { date: "2026-10-12", startTime: "13:00", endTime: "16:00" },
        { date: "2026-11-02", startTime: null, endTime: null },
      ],
    );
    expect(merged.map((r) => `${r.date} ${r.startTime}`)).toEqual([
      "2026-10-12 13:00",
      "2026-11-02 08:00",
      "2026-11-02 null",
    ]);
  });
});

describe("slotsInSession / originLabel", () => {
  const slots = [
    { date: "2026-10-12", start: "08:00", hours: 3 },
    { date: "2026-10-12", start: "11:00", hours: 1 },
    { date: "2026-10-12", start: "13:00", hours: 3 },
  ];
  it("compte les créneaux qui forment une séance", () => {
    expect(
      slotsInSession({ date: "2026-10-12", startTime: "08:00", endTime: "12:00" }, slots),
    ).toBe(2);
    expect(
      slotsInSession({ date: "2026-10-12", startTime: "13:00", endTime: "16:00" }, slots),
    ).toBe(1);
    expect(
      slotsInSession({ date: "2026-10-13", startTime: "08:00", endTime: "12:00" }, slots),
    ).toBe(0);
  });
  it("formule l'origine", () => {
    expect(originLabel(2)).toBe("2 créneaux fusionnés");
    expect(originLabel(1)).toBe("1 créneau");
    expect(originLabel(0)).toBe("Saisie à la main");
  });
});

describe("progressionDeadline", () => {
  it("J-15 avant la 1re séance, dépassée ou à venir", () => {
    expect(progressionDeadline("2026-10-12", "2026-09-29")).toMatchObject({
      date: "2026-09-27",
      daysLeft: -2,
      tone: "warn",
      label: "Dépassée de 2 jours",
    });
    expect(progressionDeadline("2026-10-12", "2026-09-20")).toMatchObject({
      tone: "ok",
      daysLeft: 7,
      label: "Dans 7 jours",
    });
    expect(progressionDeadline("2026-10-12", "2026-09-27")?.label).toBe("C’est aujourd’hui");
  });
  it("rien sans 1re séance", () => {
    expect(progressionDeadline(null, "2026-09-29")).toBeNull();
  });
});

describe("hoursBalance / createButtonLabel", () => {
  it("compare au volume du module avec une demi-heure de tolérance", () => {
    expect(hoursBalance(21, 21).state).toBe("ok");
    expect(hoursBalance(18, 21)).toEqual({ state: "missing", diff: -3 });
    expect(hoursBalance(24, 21)).toEqual({ state: "extra", diff: 3 });
    expect(hoursBalance(0, 21).state).toBe("none");
    expect(hoursBalance(5, 0).state).toBe("none");
  });
  it("libellé du bouton final", () => {
    expect(createButtonLabel(0)).toBe("Créer le module");
    expect(createButtonLabel(1)).toBe("Créer le module et sa séance");
    expect(createButtonLabel(6)).toBe("Créer le module et ses 6 séances");
  });
});
