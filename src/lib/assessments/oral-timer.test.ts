import { describe, expect, it } from "vitest";

import {
  dueAnnouncement,
  elapsedMs,
  INITIAL_CLOCK,
  pauseClock,
  startClock,
  timerAnnouncements,
  timerView,
} from "./oral-timer";

describe("horloge", () => {
  it("le temps écoulé s'additionne entre les reprises, sans dérive", () => {
    let clock = startClock(INITIAL_CLOCK, 1000);
    expect(elapsedMs(clock, 4000)).toBe(3000);
    clock = pauseClock(clock, 4000);
    expect(elapsedMs(clock, 99_000)).toBe(3000);
    clock = startClock(clock, 100_000);
    expect(elapsedMs(clock, 102_000)).toBe(5000);
  });

  it("démarrer deux fois ou mettre en pause à l'arrêt ne change rien", () => {
    const started = startClock(INITIAL_CLOCK, 10);
    expect(startClock(started, 500)).toBe(started);
    expect(pauseClock(INITIAL_CLOCK, 500)).toBe(INITIAL_CLOCK);
  });
});

describe("timerView", () => {
  const base = { durationSeconds: 300 };

  it("à l'arrêt : durée entière", () => {
    expect(timerView({ ...base, elapsedMs: 0, running: false })).toEqual({
      phase: "idle",
      remainingSeconds: 300,
      label: "5:00",
    });
  });

  it("en cours, en pause, dernière minute, dépassé", () => {
    expect(timerView({ ...base, elapsedMs: 10_000, running: true }).phase).toBe("running");
    expect(timerView({ ...base, elapsedMs: 10_000, running: false }).phase).toBe("paused");
    const warning = timerView({ ...base, elapsedMs: 245_000, running: true });
    expect(warning).toMatchObject({ phase: "warning", label: "0:55" });
    const over = timerView({ ...base, elapsedMs: 332_000, running: true });
    expect(over).toMatchObject({ phase: "over", label: "+0:32" });
  });

  it("arrondit au-dessus : 0:01 tient jusqu'à la fin", () => {
    expect(timerView({ ...base, elapsedMs: 299_500, running: true }).label).toBe("0:01");
    expect(timerView({ ...base, elapsedMs: 300_000, running: true }).phase).toBe("over");
  });
});

describe("annonces", () => {
  it("passage long : 5 minutes, 1 minute (alerte), fin", () => {
    expect(timerAnnouncements(900).map((a) => [a.atRemainingSeconds, a.level])).toEqual([
      [300, "polite"],
      [60, "alert"],
      [0, "polite"],
    ]);
  });

  it("passage court : pas d'annonce à 5 minutes ; très court (2 min ou moins) : pas d'alerte", () => {
    expect(timerAnnouncements(300).map((a) => a.atRemainingSeconds)).toEqual([60, 0]);
    expect(timerAnnouncements(90).map((a) => a.atRemainingSeconds)).toEqual([0]);
    expect(timerAnnouncements(60).map((a) => a.atRemainingSeconds)).toEqual([0]);
  });

  it("dit une annonce une seule fois, la plus proche si plusieurs seuils sont franchis", () => {
    const list = timerAnnouncements(900);
    expect(dueAnnouncement(list, 400, new Set())).toBeNull();
    expect(dueAnnouncement(list, 299, new Set())?.atRemainingSeconds).toBe(300);
    expect(dueAnnouncement(list, 299, new Set([300]))).toBeNull();
    expect(dueAnnouncement(list, 30, new Set())?.atRemainingSeconds).toBe(60);
    expect(dueAnnouncement(list, -5, new Set())?.atRemainingSeconds).toBe(0);
  });
});
