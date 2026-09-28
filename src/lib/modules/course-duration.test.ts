import { describe, expect, it } from "vitest";

import {
  calculateDuration,
  checkPlannedHours,
  formatDuration,
  formatTime,
  formatTimeRange,
  parseTime,
  totalPlannedHours,
} from "./course-duration";

describe("parseTime", () => {
  it("lit HH:MM et HH:MM:SS (format Postgres)", () => {
    expect(parseTime("10:30")).toBe(630);
    expect(parseTime("00:00")).toBe(0);
    expect(parseTime("23:59")).toBe(23 * 60 + 59);
    expect(parseTime("09:15:00")).toBe(555);
  });

  it("renvoie null pour une heure absente ou invalide", () => {
    for (const t of [null, undefined, "", "25:00", "10:60", "abc", "10h30"]) {
      expect(parseTime(t)).toBeNull();
    }
  });
});

describe("formatTime / formatTimeRange", () => {
  it("retire les secondes de Postgres", () => {
    expect(formatTime("10:00:00")).toBe("10:00");
    expect(formatTime(null)).toBe("");
  });

  it("affiche le créneau, avec ou sans fin", () => {
    expect(formatTimeRange("10:00:00", "12:00:00")).toBe("10:00–12:00");
    expect(formatTimeRange("10:00", null)).toBe("10:00");
    expect(formatTimeRange(null, "12:00")).toBe("");
  });
});

describe("calculateDuration", () => {
  it("calcule la durée en heures, à la minute près", () => {
    expect(calculateDuration("10:00", "12:00")).toBe(2);
    expect(calculateDuration("14:30", "16:00")).toBe(1.5);
    expect(calculateDuration("10:00:00", "11:45:00")).toBe(1.75);
    expect(calculateDuration("10:00", "10:20")).toBeCloseTo(1 / 3, 5);
  });

  it("renvoie null si la fin ne suit pas le début ou si une heure manque", () => {
    expect(calculateDuration("12:00", "10:00")).toBeNull();
    expect(calculateDuration("10:00", "10:00")).toBeNull();
    expect(calculateDuration(null, "12:00")).toBeNull();
    expect(calculateDuration("10:00", null)).toBeNull();
  });
});

describe("formatDuration", () => {
  it.each([
    [1, "1 h"],
    [1.5, "1 h 30"],
    [2.75, "2 h 45"],
    [0.75, "45 min"],
    [1 + 5 / 60, "1 h 05"],
  ])("%s → %s", (hours, label) => {
    expect(formatDuration(hours)).toBe(label);
  });

  it("renvoie une chaîne vide pour null", () => {
    expect(formatDuration(null)).toBe("");
  });
});

describe("totalPlannedHours", () => {
  it("additionne les créneaux valides et ignore les autres", () => {
    expect(
      totalPlannedHours([
        { start_time: "10:00:00", end_time: "12:00:00" },
        { start_time: "14:00", end_time: "16:00" },
        { start_time: null, end_time: "16:00" },
        { start_time: "14:00", end_time: null },
        {},
      ]),
    ).toBe(4);
    expect(totalPlannedHours([])).toBe(0);
  });
});

describe("checkPlannedHours", () => {
  it("tolère 0,5 h d'écart", () => {
    expect(checkPlannedHours(20.5, 21)).toEqual({ consistent: true, gap: -0.5, message: "" });
    expect(checkPlannedHours(21.5, 21).consistent).toBe(true);
  });

  it("signale les heures manquantes", () => {
    const r = checkPlannedHours(18, 21);
    expect(r.consistent).toBe(false);
    expect(r.message).toBe("Il manque 3 h par rapport aux 21 h du module.");
  });

  it("signale les heures en trop", () => {
    const r = checkPlannedHours(24, 21);
    expect(r.consistent).toBe(false);
    expect(r.message).toBe("3 h de plus que les 21 h du module.");
  });
});
