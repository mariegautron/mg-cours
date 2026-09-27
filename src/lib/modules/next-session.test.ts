import { describe, expect, it } from "vitest";

import { highlightedSession, todayInParis } from "./next-session";

const c = (id: string, session_date: string | null) => ({ id, session_date });

describe("highlightedSession", () => {
  const courses = [c("a", "2026-10-05"), c("b", "2026-10-12"), c("c", null), c("d", "2026-10-19")];

  it("met en avant la séance du jour", () => {
    expect(highlightedSession(courses, "2026-10-12")).toMatchObject({
      course: { id: "b" },
      number: 2,
      isToday: true,
    });
  });

  it("sinon la prochaine séance datée", () => {
    expect(highlightedSession(courses, "2026-10-13")).toMatchObject({
      course: { id: "d" },
      number: 4,
      isToday: false,
    });
  });

  it("renvoie null quand tout est passé", () => {
    expect(highlightedSession(courses, "2026-11-01")).toBeNull();
  });
});

describe("todayInParis", () => {
  it("bascule à minuit heure de Paris, pas UTC", () => {
    expect(todayInParis(new Date("2026-10-11T22:30:00Z"))).toBe("2026-10-12");
  });
});
