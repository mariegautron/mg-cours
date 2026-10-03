import { describe, expect, it } from "vitest";

import {
  hoursLabel,
  listDateLine,
  minutesBetween,
  neighbours,
  pickCourse,
  resourceSubtitle,
  uncoveredExpectations,
} from "./workspace";

describe("workspace", () => {
  it("ligne date/heure", () => {
    expect(listDateLine("2026-10-12", "08:00:00", "12:00:00")).toBe("12/10 · 8–12 h");
    expect(listDateLine("2026-10-12", "13:30", "16:00")).toBe("12/10 · 13:30–16 h");
    expect(listDateLine("2026-10-12", null, null)).toBe("12/10");
    expect(listDateLine(null, null, null)).toBe("Date à fixer");
  });
  it("durée", () => {
    expect(minutesBetween("08:00", "12:00")).toBe(240);
    expect(minutesBetween("12:00", "08:00")).toBeNull();
    expect(minutesBetween(null, "08:00")).toBeNull();
    expect(hoursLabel(240)).toBe("4 h");
    expect(hoursLabel(90)).toBe("1 h 30");
  });
  it("voisines et séance à ouvrir", () => {
    const list = [
      { id: "a", session_date: "2026-10-01", prep_status: "ready" },
      { id: "b", session_date: "2026-11-01", prep_status: "todo" },
      { id: "c", session_date: null, prep_status: "ready" },
    ];
    expect(neighbours(list, "b")).toMatchObject({ index: 1, prev: list[0], next: list[2] });
    expect(neighbours(list, "a").prev).toBeNull();
    expect(neighbours(list, "zz").index).toBe(-1);
    expect(pickCourse(list, "2026-10-15")?.id).toBe("b");
    expect(pickCourse(list, "2027-01-01")?.id).toBe("b");
    expect(pickCourse([], "2026-01-01")).toBeNull();
  });
  it("sous-titres de ressource", () => {
    expect(
      resourceSubtitle({
        status: "progress",
        audience: "teacher",
        kind: "answer_key",
        slideCount: 0,
      }),
    ).toBe("Corrigé à écrire");
    expect(
      resourceSubtitle({
        status: "progress",
        audience: "students",
        kind: "workshop",
        slideCount: 0,
      }),
    ).toBe("À construire");
    expect(
      resourceSubtitle({ status: "ready", audience: "teacher", kind: "answer_key", slideCount: 0 }),
    ).toBe("Pour toi seule");
    expect(
      resourceSubtitle({ status: "ready", audience: "students", kind: "course", slideCount: 12 }),
    ).toBe("12 diapositives");
  });
  it("attendus sans séance", () => {
    const m = new Map([["e1", ["c1"]]]);
    expect(uncoveredExpectations([{ id: "e1" }, { id: "e2" }], m)).toEqual([{ id: "e2" }]);
  });
});
