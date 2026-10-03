import { describe, expect, it } from "vitest";

import {
  dayLine,
  dayTile,
  meanLabel,
  percent,
  progressLabel,
  sessionsCaption,
  untilLabel,
} from "./overview";
import type { WeekDay } from "./week";

const day = (over: Partial<WeekDay<{ position: number }>>): WeekDay<{ position: number }> => ({
  date: "2026-11-02",
  label: "LUN",
  day: 2,
  isToday: false,
  courses: [],
  ...over,
});

describe("sessionsCaption", () => {
  it("un, deux, trois numéros", () => {
    expect(sessionsCaption([5])).toBe("Séance 5");
    expect(sessionsCaption([4, 3])).toBe("Séances 3 et 4");
    expect(sessionsCaption([2, 3, 4])).toBe("Séances 2, 3 et 4");
    expect(sessionsCaption([])).toBe("");
  });
});

describe("dayTile", () => {
  const today = "2026-11-04";
  it("passé fait ✓, aujourd'hui ●, à venir ▲, vide", () => {
    expect(
      dayTile(
        day({ date: "2026-11-02", courses: [{ position: 3 }, { position: 4 }] }),
        today,
        () => true,
      ),
    ).toMatchObject({
      state: "done",
      mark: "✓",
      caption: "Séances 3 et 4",
    });
    expect(dayTile(day({ date: today, isToday: true }), today, () => true)).toMatchObject({
      state: "today",
      mark: "●",
      caption: "Aujourd’hui",
    });
    expect(
      dayTile(day({ date: "2026-11-05", courses: [{ position: 5 }] }), today, () => false),
    ).toMatchObject({ state: "upcoming", mark: "▲", caption: "Séance 5" });
    expect(dayTile(day({ date: "2026-11-03" }), today, () => true)).toMatchObject({
      state: "empty",
      mark: "",
    });
  });
  it("passé non clôturé : pas de ✓ mais la séance reste dite", () => {
    const t = dayTile(day({ date: "2026-11-02", courses: [{ position: 3 }] }), today, () => false);
    expect(t.state).toBe("empty");
    expect(t.caption).toBe("Séance 3");
  });
});

describe("libellés", () => {
  it("proximité", () => {
    expect(untilLabel("2026-11-04", "2026-11-05")).toBe("Dans 1 jour");
    expect(untilLabel("2026-11-04", "2026-11-09")).toBe("Dans 5 jours");
    expect(untilLabel("2026-11-04", "2026-11-04")).toBe("Aujourd’hui");
  });
  it("pourcentage borné, moyenne, avancement", () => {
    expect(percent(4, 6)).toBe(67);
    expect(percent(9, 6)).toBe(100);
    expect(percent(1, 0)).toBe(0);
    expect(meanLabel([14, 14.2])).toBe("14,1");
    expect(meanLabel([])).toBeNull();
    expect(progressLabel(1, 6)).toBe("Séance 1 faite sur 6");
    expect(progressLabel(4, 6)).toBe("Séances 4 faites sur 6");
  });
  it("sous-titre de l'accueil", () => {
    expect(dayLine("Mercredi 4 novembre", 0, { daysUntil: 1, position: 5 })).toBe(
      "Mercredi 4 novembre · pas de cours aujourd’hui, demain séance 5",
    );
    expect(dayLine("Mercredi 4 novembre", 0, { daysUntil: 3, position: 5 })).toBe(
      "Mercredi 4 novembre · pas de cours aujourd’hui, dans 3 jours séance 5",
    );
    expect(dayLine("Mercredi 4 novembre", 0, null)).toBe(
      "Mercredi 4 novembre · pas de cours aujourd’hui",
    );
    expect(dayLine("Lundi 2 novembre", 2, null)).toBe("Lundi 2 novembre · 2 séances aujourd’hui");
  });
});
