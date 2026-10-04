import { describe, expect, it } from "vitest";

import {
  buildFrise,
  publicSlidesUrl,
  bandLayout,
  firstLine,
  milestoneLabel,
  moduleShareUrl,
  nextMilestone,
  parseFrise,
  periodOf,
  sessionHeading,
  sessionEvents,
  shortDate,
  summaryLine,
} from "./frise";

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
    expect(Object.keys(f).sort()).toEqual([
      "launchSession",
      "milestones",
      "moduleName",
      "sessions",
      "totalHours",
    ]);
    expect(Object.keys(f.sessions[0]).sort()).toEqual([
      "date",
      "number",
      "period",
      "slidesUrl",
      "title",
    ]);
    // Le lien de slides ne sort que s'il est http(s).
    expect(publicSlidesUrl("javascript:alert(1)")).toBeNull();
    expect(publicSlidesUrl("https://figma.com/slides/x")).toBe("https://figma.com/slides/x");
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

  it("rôles, rendu attendu (sujet prêt seulement) et lancement du projet", () => {
    const f = buildFrise({
      moduleName: "Agile",
      totalHours: 21,
      courses,
      assessments: [
        {
          id: "j",
          title: "Jalon 1",
          course_id: "c3",
          is_group_grade: true,
          makeup_of_id: null,
          project_role: "milestone",
          project_id: "p",
          deliverable_md: "- Un backlog priorisé (PDF ou lien)\n- Vos estimations",
          prep_status: "ready",
        },
        {
          id: "o",
          title: "Oral",
          course_id: "c3",
          is_group_grade: true,
          makeup_of_id: null,
          project_role: "oral",
          project_id: "p",
          deliverable_md: "Secret en construction",
          prep_status: "to_build",
        },
      ],
    });
    expect(f.launchSession).toBe(1);
    expect(f.milestones[0]).toMatchObject({
      role: "milestone",
      deliverable: "Un backlog priorisé (PDF ou lien)",
    });
    expect(f.milestones[1]).toMatchObject({ role: "oral", deliverable: null });
    expect(parseFrise(JSON.parse(JSON.stringify(f)))).toEqual(f);
  });
  it("relit un ancien instantané sans les nouveaux champs", () => {
    const old = {
      moduleName: "Agile",
      totalHours: 21,
      sessions: [{ number: 1, date: "2026-10-12", period: "morning", title: "Lancement" }],
      milestones: [{ title: "QCM", sessionNumber: 1, kind: "individual" }],
    };
    expect(parseFrise(old)).toMatchObject({
      launchSession: null,
      milestones: [{ title: "QCM", role: null, deliverable: null }],
    });
  });
  it("événements par séance, libellés et prochain rendu", () => {
    const f = buildFrise({
      moduleName: "Agile",
      totalHours: null,
      courses,
      assessments: [
        {
          id: "j",
          title: "Jalon 1",
          course_id: "c2",
          is_group_grade: true,
          makeup_of_id: null,
          project_role: "milestone",
          project_id: "p",
        },
        {
          id: "o",
          title: "Oral",
          course_id: "c3",
          is_group_grade: true,
          makeup_of_id: null,
          project_role: "oral",
          project_id: "p",
        },
      ],
    });
    const events = sessionEvents(f);
    expect(events.get(1)).toEqual([{ kind: "launch", label: "Lancement" }]);
    expect(events.get(2)).toEqual([{ kind: "group", label: "Jalon 1 · note de groupe" }]);
    expect(events.get(3)).toEqual([{ kind: "group", label: "Oral · groupe" }]);
    expect(milestoneLabel(f.milestones[1])).toBe("Oral de fin de projet");
    expect(nextMilestone(f, "2026-10-13")?.title).toBe("Oral");
    expect(nextMilestone(f, "2026-10-01")?.title).toBe("Jalon 1");
  });
  it("première ligne utile", () => {
    expect(firstLine("\n## Titre\n- Un backlog")).toBe("Titre");
    expect(firstLine(null)).toBeNull();
    expect(firstLine("a".repeat(300))).toHaveLength(160);
  });

  it("bandes de la frise : lancement, notes de groupe puis individuelles, sans chevauchement", () => {
    const six = Array.from({ length: 6 }, (_, i) => ({
      id: `s${i + 1}`,
      title: `S${i + 1}`,
      session_date: `2026-10-${12 + i}`,
      start_time: "09:00",
    }));
    const f = buildFrise({
      moduleName: "Agile",
      totalHours: 21,
      courses: six,
      assessments: [
        {
          id: "j",
          title: "Jalon 1",
          course_id: "s3",
          is_group_grade: true,
          makeup_of_id: null,
          project_role: "milestone",
          project_id: "p",
        },
        {
          id: "o",
          title: "Oral",
          course_id: "s6",
          is_group_grade: true,
          makeup_of_id: null,
          project_role: "oral",
          project_id: "p",
        },
        {
          id: "i",
          title: "Individuelle",
          course_id: "s6",
          is_group_grade: false,
          makeup_of_id: null,
          project_role: "individual",
          project_id: "p",
        },
      ],
    });
    const bands = bandLayout(f);
    expect(bands.map((b) => [b.label, b.start, b.end, b.row])).toEqual([
      ["Lancement du projet", 1, 2, 0],
      ["Jalon 1 : rendu", 2, 3, 1],
      ["Oral de fin de projet", 5, 6, 0],
      ["Évaluation individuelle", 5, 6, 2],
    ]);
  });

  it("titre de séance sans doublon quand il est par défaut", () => {
    expect(sessionHeading({ number: 1, title: "Séance 1" })).toBe("Séance 1");
    expect(sessionHeading({ number: 2, title: "Cérémonies Scrum" })).toBe(
      "Séance 2 · Cérémonies Scrum",
    );
  });
});
