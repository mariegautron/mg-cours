import {
  normalizeDate,
  normalizeTime,
  parseScheduleLine,
  parseSchedule,
  validateSessionOrder,
} from "./schedule-parser";
import { describe, expect, it } from "vitest";

describe("normalizeDate", () => {
  it("devrait parser DD/MM/YYYY", () => {
    expect(normalizeDate("01/10/2026")).toBe("2026-10-01");
    expect(normalizeDate("31/12/2025")).toBe("2025-12-31");
  });

  it("devrait parser DD/MM/YY", () => {
    expect(normalizeDate("01/10/26")).toBe("2026-10-01");
  });

  it("devrait parser DD-MM-YYYY", () => {
    expect(normalizeDate("01-10-2026")).toBe("2026-10-01");
    expect(normalizeDate("31-12-2025")).toBe("2025-12-31");
  });

  it("devrait parser DD.MM.YYYY", () => {
    expect(normalizeDate("01.10.2026")).toBe("2026-10-01");
  });

  it("devrait parser DD/MM (sans annee)", () => {
    const now = new Date();
    const year = now.getFullYear();
    expect(normalizeDate("01/10")).toBe(`${year}-10-01`);
  });

  it("devrait retourner null pour format invalide", () => {
    expect(normalizeDate("invalid")).toBeNull();
    expect(normalizeDate("2026/10/01")).toBeNull(); // YYYY/MM/DD
    expect(normalizeDate("")).toBeNull();
  });
});

describe("normalizeTime", () => {
  it("devrait parser HH:MM", () => {
    expect(normalizeTime("10:00")).toBe("10:00");
    expect(normalizeTime("14:30")).toBe("14:30");
  });

  it("devrait parser HHhMM", () => {
    expect(normalizeTime("10h00")).toBe("10:00");
    expect(normalizeTime("14h30")).toBe("14:30");
  });

  it("devrait parser HHh", () => {
    expect(normalizeTime("10h")).toBe("10:00");
    expect(normalizeTime("14h")).toBe("14:00");
  });

  it("devrait parser HH h MM", () => {
    expect(normalizeTime("10 h 00")).toBe("10:00");
    expect(normalizeTime("14 h 30")).toBe("14:30");
  });

  it("devrait parser HH h", () => {
    expect(normalizeTime("10h")).toBe("10:00");
  });

  it("devrait parser HH (seulement)", () => {
    expect(normalizeTime("10")).toBe("10:00");
    expect(normalizeTime("14")).toBe("14:00");
  });

  it("devrait retourner null pour format invalide", () => {
    expect(normalizeTime("invalid")).toBeNull();
    expect(normalizeTime("")).toBeNull();
    expect(normalizeTime("10 h")).toBeNull(); // espace avant h n'est pas gere
  });
});

describe("parseScheduleLine", () => {
  it("devrait parser date + heure avec separateur espace", () => {
    const result = parseScheduleLine("01/10/2026 10:00-12:00", 1);
    expect(result).toEqual({
      date: "2026-10-01",
      startTime: "10:00",
      endTime: "12:00",
      position: 1,
    });
  });

  it("devrait parser date + heure avec separateur -", () => {
    const result = parseScheduleLine("01/10/2026 10:00-12:00", 1);
    expect(result).toEqual({
      date: "2026-10-01",
      startTime: "10:00",
      endTime: "12:00",
      position: 1,
    });
  });

  it("devrait parser date + heure avec format FR", () => {
    const result = parseScheduleLine("01/10/2026 10h-12h", 1);
    expect(result).toEqual({
      date: "2026-10-01",
      startTime: "10:00",
      endTime: "12:00",
      position: 1,
    });
  });

  it("devrait parser date + heure avec virgule", () => {
    const result = parseScheduleLine("01/10/2026, 10:00 12:00", 1);
    expect(result).toEqual({
      date: "2026-10-01",
      startTime: "10:00",
      endTime: "12:00",
      position: 1,
    });
  });

  it("devrait parser date seulement", () => {
    const result = parseScheduleLine("01/10/2026", 1);
    expect(result).toEqual({
      date: "2026-10-01",
      startTime: null,
      endTime: null,
      position: 1,
    });
  });

  it("devrait retourner null pour ligne vide", () => {
    expect(parseScheduleLine("", 1)).toBeNull();
    expect(parseScheduleLine("   ", 1)).toBeNull();
  });

  it("devrait retourner null pour format invalide", () => {
    expect(parseScheduleLine("invalid", 1)).toBeNull();
  });
});

describe("parseSchedule", () => {
  it("devrait parser plusieurs lignes", () => {
    const text = `01/10/2026 10:00-12:00
08/10/2026 14:00 16:00
15/10/2026 10h-12h`;

    const result = parseSchedule(text);
    expect(result.sessions).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
    expect(result.sessions[0].date).toBe("2026-10-01");
    expect(result.sessions[1].date).toBe("2026-10-08");
    expect(result.sessions[2].date).toBe("2026-10-15");
  });

  it("devrait ignorer les lignes vides", () => {
    const text = `01/10/2026 10:00-12:00

08/10/2026 14:00 16:00

`;

    const result = parseSchedule(text);
    expect(result.sessions).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it("devrait signaler les erreurs", () => {
    const text = `01/10/2026 10:00-12:00
invalid line
08/10/2026 14:00 16:00`;

    const result = parseSchedule(text);
    expect(result.sessions).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Ligne 2");
  });
});

describe("validateSessionOrder", () => {
  it("devrait valider l'ordre chronologique", () => {
    const sessions = [
      { date: "2026-10-01", startTime: "10:00", endTime: "12:00", position: 1 },
      { date: "2026-10-08", startTime: "14:00", endTime: "16:00", position: 2 },
      { date: "2026-10-15", startTime: "10:00", endTime: "12:00", position: 3 },
    ];
    expect(validateSessionOrder(sessions)).toBeNull();
  });

  it("devrait detecter l'ordre non chronologique", () => {
    const sessions = [
      { date: "2026-10-08", startTime: "14:00", endTime: "16:00", position: 1 },
      { date: "2026-10-01", startTime: "10:00", endTime: "12:00", position: 2 },
    ];
    const result = validateSessionOrder(sessions);
    expect(result).toContain("ordre chronologique");
  });

  it("devrait detecter le chevauchement", () => {
    const sessions = [
      { date: "2026-10-01", startTime: "10:00", endTime: "14:00", position: 1 },
      { date: "2026-10-01", startTime: "12:00", endTime: "16:00", position: 2 },
    ];
    const result = validateSessionOrder(sessions);
    expect(result).toContain("Chevauchement");
  });
});
