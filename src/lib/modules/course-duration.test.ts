import {
  parseTime,
  calculateDuration,
  formatDuration,
  totalPlannedHours,
  checkPlannedHours,
} from "./course-duration";
import { describe, expect, it } from "vitest";

describe("parseTime", () => {
  it("devrait parser une heure valide", () => {
    expect(parseTime("10:30")).toBe(10 * 60 + 30);
    expect(parseTime("00:00")).toBe(0);
    expect(parseTime("23:59")).toBe(23 * 60 + 59);
  });

  it("devrait retourner null pour une heure invalide", () => {
    expect(parseTime(null)).toBeNull();
    expect(parseTime("")).toBeNull();
    expect(parseTime("25:00")).toBeNull();
    expect(parseTime("10:60")).toBeNull();
    expect(parseTime("invalid")).toBeNull();
  });
});

describe("calculateDuration", () => {
  it("devrait calculer une duree simple", () => {
    expect(calculateDuration("10:00", "12:00")).toBe(2);
    expect(calculateDuration("14:30", "16:00")).toBe(1.5);
  });

  it("devrait arrondir a 15 min", () => {
    // 1h12 = 72 min -> 75 min = 1.25h
    expect(calculateDuration("10:00", "11:12")).toBe(1.25);
    // 1h08 = 68 min -> 60 min = 1h
    expect(calculateDuration("10:00", "11:07")).toBe(1);
    // 1h17 = 77 min -> 75 min = 1.25h
    expect(calculateDuration("10:00", "11:17")).toBe(1.25);
  });

  it("devrait retourner null si start >= end", () => {
    expect(calculateDuration("12:00", "10:00")).toBeNull();
    expect(calculateDuration("10:00", "10:00")).toBeNull();
  });

  it("devrait retourner null si heures manquantes", () => {
    expect(calculateDuration(null, "12:00")).toBeNull();
    expect(calculateDuration("10:00", null)).toBeNull();
    expect(calculateDuration(null, null)).toBeNull();
  });
});

describe("formatDuration", () => {
  it("devrait formater des durees en heures", () => {
    expect(formatDuration(1)).toBe("1 h");
    expect(formatDuration(2)).toBe("2 h");
  });

  it("devrait formater des durees avec heures et minutes", () => {
    expect(formatDuration(1.5)).toBe("1 h 30");
    expect(formatDuration(2.75)).toBe("2 h 45");
  });

  it("devrait formater des durees en minutes seulement", () => {
    expect(formatDuration(0.75)).toBe("45 min");
    expect(formatDuration(0.25)).toBe("15 min");
  });

  it("devrait retourner vide pour null", () => {
    expect(formatDuration(null)).toBe("");
  });
});

describe("totalPlannedHours", () => {
  it("devrait sommer les durees valides", () => {
    const courses = [
      { start_time: "10:00", end_time: "12:00" },
      { start_time: "14:00", end_time: "16:00" },
    ];
    expect(totalPlannedHours(courses)).toBe(4);
  });

  it("devrait ignorer les seances sans heures valides", () => {
    const courses = [
      { start_time: "10:00", end_time: "12:00" },
      { start_time: null, end_time: "16:00" },
      { start_time: "14:00", end_time: null },
    ];
    expect(totalPlannedHours(courses)).toBe(2);
  });

  it("devrait retourner 0 pour une liste vide", () => {
    expect(totalPlannedHours([])).toBe(0);
  });
});

describe("checkPlannedHours", () => {
  it("devrait etre coherent si difference <= 0.5h", () => {
    const result = checkPlannedHours(20.5, 21);
    expect(result.consistent).toBe(true);
    expect(result.message).toBe("");
  });

  it("devrait detecter un manque d'heures", () => {
    const result = checkPlannedHours(18, 21);
    expect(result.consistent).toBe(false);
    expect(result.message).toBe("18 h planifiees / 21 h - il manque 3 h");
  });

  it("devrait detecter un excess d'heures", () => {
    const result = checkPlannedHours(24, 21);
    expect(result.consistent).toBe(false);
    expect(result.message).toBe("24 h planifiees / 21 h - excess de 3 h");
  });

  it("devrait formater correctement avec des minutes", () => {
    const result = checkPlannedHours(20.5, 21);
    expect(result.consistent).toBe(true);
    expect(result.message).toBe("");

    const result2 = checkPlannedHours(20, 21);
    expect(result2.consistent).toBe(false);
    expect(result2.message).toBe("20 h planifiees / 21 h - il manque 1 h");
  });
});
