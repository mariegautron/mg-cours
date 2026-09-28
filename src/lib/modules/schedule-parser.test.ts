import { describe, expect, it } from "vitest";

import {
  addDays,
  duplicateRow,
  isValidIsoDate,
  parseSchedule,
  parseScheduleLine,
  planSessions,
  readScheduleRows,
} from "./schedule-parser";

describe("parseScheduleLine", () => {
  it.each([
    ["01/10/2026 10:00-12:00", "2026-10-01", "10:00", "12:00"],
    ["01/10 10h-12h", "2026-10-01", "10:00", "12:00"],
    ["jeudi 1/10/2026 de 14h à 16h30", "2026-10-01", "14:00", "16:30"],
    ["01-10-2026 10h00 12h00", "2026-10-01", "10:00", "12:00"],
    ["01.10.26 9h - 11h", "2026-10-01", "09:00", "11:00"],
    ["  08/10/2026 , 10:00 12:00 ", "2026-10-08", "10:00", "12:00"],
  ])("lit « %s »", (line, date, start, end) => {
    expect(parseScheduleLine(line, 2026)).toEqual({ date, startTime: start, endTime: end });
  });

  it("accepte une date sans heure ni fin", () => {
    expect(parseScheduleLine("15/10/2026", 2026)).toEqual({
      date: "2026-10-15",
      startTime: null,
      endTime: null,
    });
    expect(parseScheduleLine("15/10/2026 14h", 2026)).toEqual({
      date: "2026-10-15",
      startTime: "14:00",
      endTime: null,
    });
  });

  it("prend l'année du module quand elle manque", () => {
    expect(parseScheduleLine("12/01 10h-12h", 2027)?.date).toBe("2027-01-12");
  });

  it("refuse une date inexistante, une heure impossible ou un texte sans date", () => {
    expect(parseScheduleLine("31/02/2026 10h-12h", 2026)).toBeNull();
    expect(parseScheduleLine("01/10/2026 25h-26h", 2026)).toBeNull();
    expect(parseScheduleLine("01/10/2026 10h 11h 12h", 2026)).toBeNull();
    expect(parseScheduleLine("mardi matin", 2026)).toBeNull();
  });
});

describe("parseSchedule", () => {
  it("renvoie les créneaux reconnus et les lignes ignorées avec leur numéro", () => {
    const { rows, ignored } = parseSchedule(
      "01/10/2026 10:00-12:00\n\nn'importe quoi\n08/10 14h-16h\r\n",
      2026,
    );
    expect(rows.map((r) => r.date)).toEqual(["2026-10-01", "2026-10-08"]);
    expect(ignored).toEqual([{ line: 3, text: "n'importe quoi" }]);
  });
});

describe("dates", () => {
  it("ajoute des jours sans dérive de fuseau, y compris au changement d'heure", () => {
    expect(addDays("2026-10-01", 7)).toBe("2026-10-08");
    expect(addDays("2026-10-25", 7)).toBe("2026-11-01");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
  });

  it("duplique un créneau +7 jours en gardant les horaires", () => {
    expect(duplicateRow({ date: "2026-10-01", startTime: "10:00", endTime: "12:00" })).toEqual({
      date: "2026-10-08",
      startTime: "10:00",
      endTime: "12:00",
    });
  });

  it("valide le calendrier", () => {
    expect(isValidIsoDate("2028-02-29")).toBe(true);
    expect(isValidIsoDate("2026-02-29")).toBe(false);
  });
});

describe("planSessions", () => {
  const rows = [
    { date: "2026-10-08", startTime: "14:00", endTime: "16:00" },
    { date: "2026-10-01", startTime: "10:00", endTime: "12:30" },
    { date: "2026-10-15", startTime: null, endTime: null },
  ];

  it("trie, numérote « Séance 1…N » et déduit la 1re date", () => {
    const plan = planSessions(rows);
    expect(plan.sessions.map((s) => [s.title, s.date])).toEqual([
      ["Séance 1", "2026-10-01"],
      ["Séance 2", "2026-10-08"],
      ["Séance 3", "2026-10-15"],
    ]);
    expect(plan.firstSessionDate).toBe("2026-10-01");
    expect(plan.totalHours).toBe(4.5);
    expect(plan.issues).toEqual([]);
  });

  it("poursuit la numérotation d'un module qui a déjà des séances", () => {
    const plan = planSessions(rows, 4);
    expect(plan.sessions.map((s) => s.title)).toEqual(["Séance 5", "Séance 6", "Séance 7"]);
  });

  it("signale un chevauchement et un doublon", () => {
    const plan = planSessions([
      { date: "2026-10-01", startTime: "10:00", endTime: "12:00" },
      { date: "2026-10-01", startTime: "11:00", endTime: "13:00" },
      { date: "2026-10-01", startTime: "11:00", endTime: "13:00" },
    ]);
    expect(plan.issues).toHaveLength(2);
  });

  it("gère un planning vide", () => {
    expect(planSessions([])).toEqual({
      sessions: [],
      firstSessionDate: null,
      totalHours: 0,
      issues: [],
    });
  });
});

describe("readScheduleRows", () => {
  it("lit un JSON valide et rejette le reste", () => {
    const ok = JSON.stringify([{ date: "2026-10-01", startTime: "10:00", endTime: null }]);
    expect(readScheduleRows(ok)).toHaveLength(1);
    expect(readScheduleRows("")).toEqual([]);
    expect(readScheduleRows("pas du json")).toBeNull();
    expect(readScheduleRows(JSON.stringify([{ date: "01/10/2026" }]))).toBeNull();
  });
});
