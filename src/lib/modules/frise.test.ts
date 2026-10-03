import { describe, expect, it } from "vitest";

import { buildFrise, moduleShareUrl, parseFrise, periodOf, shortDate, summaryLine } from "./frise";

const courses = [
  { id: "c1", title: "Lancement", session_date: "2026-10-12", start_time: "09:00:00" },
  { id: "c2", title: "Atelier", session_date: "2026-10-12", start_time: "13:30" },
  { id: "c3", title: "Rendu", session_date: null, start_time: null },
];

describe("frise", () => {
  it("demi-journée selon l'heure de début", () => {
    expect(periodOf("09:00:00")).toBe("morning");
    expect(periodOf("12:29")).toBe("morning");
    expect(periodOf("12:30")).toBe("afternoon");
    expect(periodOf(null)).toBeNull();
  });
  it("numérote les séances, place les jalons, ignore les rattrapages", () => {
    const f = buildFrise({
      moduleName: "Agile",
      totalHours: 21,
      courses,
      assessments: [
        { id: "a2", title: "Oral", course_id: "c3", is_group_grade: true, makeup_of_id: null },
        { id: "a1", title: "QCM", course_id: "c1", is_group_grade: false, makeup_of_id: null },
        {
          id: "a3",
          title: "Rattrapage QCM",
          course_id: "c2",
          is_group_grade: false,
          makeup_of_id: "a1",
        },
        { id: "a4", title: "Libre", course_id: null, is_group_grade: true, makeup_of_id: null },
      ],
    });
    expect(f.sessions.map((s) => s.number)).toEqual([1, 2, 3]);
    expect(f.milestones.map((m) => [m.title, m.sessionNumber, m.kind])).toEqual([
      ["QCM", 1, "individual"],
      ["Oral", 3, "group"],
      ["Libre", null, "group"],
    ]);
    expect(summaryLine(f)).toBe("3 séances · 21 heures · 3 notes");
  });
  it("l'instantané ne contient que des titres, dates et types", () => {
    const f = buildFrise({ moduleName: "Agile", totalHours: null, courses, assessments: [] });
    expect(Object.keys(f).sort()).toEqual(["milestones", "moduleName", "sessions", "totalHours"]);
    expect(Object.keys(f.sessions[0]).sort()).toEqual(["date", "number", "period", "title"]);
  });
  it("dates courtes", () => {
    expect(shortDate("2026-10-12")).toBe("12/10");
    expect(shortDate(null)).toBe("date à fixer");
  });
  it("parseFrise relit un instantané valide, refuse le reste", () => {
    const f = buildFrise({ moduleName: "Agile", totalHours: 21, courses, assessments: [] });
    expect(parseFrise(JSON.parse(JSON.stringify(f)))).toEqual(f);
    expect(parseFrise(null)).toBeNull();
    expect(parseFrise({ moduleName: "x", sessions: [{}], milestones: [] })).toBeNull();
  });
  it("url partageable", () => {
    expect(moduleShareUrl("https://x.fr/", "T")).toBe("https://x.fr/module/T");
  });
});
