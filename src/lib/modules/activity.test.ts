import { describe, expect, it } from "vitest";

import {
  checkDuration,
  cleanActivity,
  EMPTY_ACTIVITY,
  formatMinutes,
  startTimes,
  totalMinutes,
} from "./activity";

describe("cleanActivity", () => {
  it("garde les valeurs valides", () => {
    expect(
      cleanActivity({
        durationMinutes: "45",
        type: "atelier",
        startTime: "09:30:00",
        objective: "Analyser",
        prepState: "ready",
      }),
    ).toEqual({
      durationMinutes: 45,
      type: "atelier",
      startTime: "09:30",
      objective: "Analyser",
      prepState: "ready",
    });
  });
  it("vide ce qui est inconnu ou hors cadre", () => {
    expect(
      cleanActivity({
        durationMinutes: "0",
        type: "x",
        startTime: "25:00",
        objective: "Rêver",
        prepState: "?",
      }),
    ).toEqual(EMPTY_ACTIVITY);
    expect(cleanActivity({ durationMinutes: 601 }).durationMinutes).toBeNull();
    expect(cleanActivity({ durationMinutes: 12.5 }).durationMinutes).toBeNull();
    expect(cleanActivity({ durationMinutes: "" }).durationMinutes).toBeNull();
  });
});

describe("durées", () => {
  it("formate et additionne", () => {
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(120)).toBe("2 h");
    expect(formatMinutes(90)).toBe("1 h 30");
    expect(
      totalMinutes([{ durationMinutes: 30 }, { durationMinutes: null }, { durationMinutes: 45 }]),
    ).toBe(75);
  });
  it("compare à la durée de la séance", () => {
    expect(checkDuration(0, 240).status).toBe("unknown");
    expect(checkDuration(235, 240).status).toBe("ok");
    expect(checkDuration(150, 240)).toMatchObject({ status: "short" });
    expect(checkDuration(150, 240).message).toContain("il reste 1 h 30");
    expect(checkDuration(260, 240).message).toContain("dépasse de 20 min");
    expect(checkDuration(60, null).message).toBe("Déroulé : 1 h.");
  });
});

describe("startTimes", () => {
  it("déduit les horaires des durées, sauf horaire saisi", () => {
    expect(
      startTimes("08:00", [
        { durationMinutes: 30, startTime: null },
        { durationMinutes: 45, startTime: null },
        { durationMinutes: 15, startTime: "10:00" },
        { durationMinutes: null, startTime: null },
      ]),
    ).toEqual(["08:00", "08:30", "10:00", "10:15"]);
  });
  it("sans heure de séance ni horaire, rien à déduire", () => {
    expect(startTimes(null, [{ durationMinutes: 30, startTime: null }])).toEqual([null]);
  });
});
