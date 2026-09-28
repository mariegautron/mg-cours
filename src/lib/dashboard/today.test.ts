import { describe, expect, it } from "vitest";

import { todayInParis } from "@/lib/modules/next-session";

import { todaySessions } from "./today";

const course = (
  id: string,
  date: string | null,
  module: string,
  position = 0,
  archived: string | null = null,
) => ({
  id,
  title: `Séance ${id}`,
  position,
  session_date: date,
  start_time: null as string | null,
  end_time: null as string | null,
  module: { id: `m-${module}`, name: module, archived_at: archived },
});

describe("todaySessions", () => {
  it("garde les séances du jour des modules actifs, triées par module puis position", () => {
    const list = todaySessions(
      [
        course("b2", "2026-10-12", "Scrum", 2),
        course("x", "2026-10-13", "Scrum"),
        course("a", "2026-10-12", "Accessibilité", 1),
        course("b1", "2026-10-12", "Scrum", 1),
        course("arch", "2026-10-12", "Ancien", 0, "2026-06-30T00:00:00Z"),
        course("nodate", null, "Scrum"),
        { ...course("orphan", "2026-10-12", "?"), module: null },
      ],
      "2026-10-12",
    );
    expect(list.map((c) => c.id)).toEqual(["a", "b1", "b2"]);
  });

  it("classe d'abord par heure de début, les séances sans horaire à la fin", () => {
    const list = todaySessions(
      [
        course("sans", "2026-10-12", "Accessibilité"),
        { ...course("apres", "2026-10-12", "Accessibilité", 2), start_time: "14:00:00" },
        { ...course("matin", "2026-10-12", "Scrum", 1), start_time: "09:00:00" },
      ],
      "2026-10-12",
    );
    expect(list.map((c) => c.id)).toEqual(["matin", "apres", "sans"]);
  });

  it("utilise la date de Paris : 23 h 30 UTC la veille = déjà le jour J", () => {
    const today = todayInParis(new Date("2026-10-11T23:30:00Z"));
    expect(today).toBe("2026-10-12");
    expect(todaySessions([course("a", "2026-10-12", "Scrum")], today)).toHaveLength(1);
  });
});
