import { describe, expect, it } from "vitest";

import { buildTodos, daysBetween, pickTodos, TODO_LIMIT, type TodoItem } from "./todo";
import { weekDays, weekRange } from "./week";

const item = (key: string, kind: TodoItem["kind"], urgency: number, title = key): TodoItem => ({
  key,
  kind,
  title,
  detail: "",
  href: "/x",
  urgency,
});

describe("pickTodos", () => {
  it("garde les plus urgents, plafonnés à 3", () => {
    const all = [
      item("a", "payment", 20),
      item("b", "outline_urgent", 5),
      item("c", "invoice_send", 10),
      item("d", "session_prep", 1),
      item("e", "outline_overdue", -3),
    ];
    expect(pickTodos(all).map((i) => i.key)).toEqual(["e", "d", "b"]);
    expect(TODO_LIMIT).toBe(3);
  });
  it("à urgence égale, départage par type puis par titre", () => {
    const all = [
      item("z", "invoice_ready", 10, "Zèbre"),
      item("y", "invoice_send", 10, "Yack"),
      item("x", "invoice_send", 10, "Aigle"),
    ];
    expect(pickTodos(all).map((i) => i.key)).toEqual(["x", "y", "z"]);
  });
  it("ne dépend pas de l'ordre d'entrée et ne modifie pas la liste", () => {
    const all = [item("a", "payment", 20), item("b", "session_prep", 1)];
    const copy = [...all];
    expect(pickTodos(all)).toEqual(pickTodos([...all].reverse()));
    expect(all).toEqual(copy);
  });
  it("vide : rien à faire", () => {
    expect(pickTodos([])).toEqual([]);
  });
});

describe("buildTodos", () => {
  const base = {
    today: "2026-11-04",
    outlineAlerts: [
      { module: { id: "m1", name: "Agile" }, level: "overdue" as const, daysUntilDue: -2 },
    ],
    upcomingCourses: [
      {
        id: "c1",
        title: "Estimation",
        position: 5,
        session_date: "2026-11-05",
        prep_status: "draft",
        module: { id: "m1", name: "Agile" },
      },
      {
        id: "c2",
        title: "Prête",
        position: 6,
        session_date: "2026-11-05",
        prep_status: "ready",
        module: { id: "m1", name: "Agile" },
      },
      {
        id: "c3",
        title: "Trop loin",
        position: 7,
        session_date: "2026-12-25",
        prep_status: "draft",
        module: { id: "m1", name: "Agile" },
      },
    ],
    billing: [{ module: { id: "m2", name: "Design" }, kind: "toSend" as const }],
  };
  it("progression en retard, séance à préparer sous 7 jours, facture ; ignore prêtes et lointaines", () => {
    const todos = buildTodos(base);
    expect(todos.map((t) => t.key).sort()).toEqual(["billing-toSend-m2", "outline-m1", "prep-c1"]);
    const prep = todos.find((t) => t.key === "prep-c1")!;
    expect(prep.title).toBe("Préparer la séance 5");
    expect(prep.detail).toContain("demain");
    expect(prep.href).toBe("/modules/m1/courses/c1/edit");
  });
  it("le plus urgent d'abord après tri", () => {
    expect(pickTodos(buildTodos(base))[0].key).toBe("outline-m1");
  });
});

describe("daysBetween", () => {
  it("compte les jours, y compris à cheval sur un mois ou un changement d'heure", () => {
    expect(daysBetween("2026-10-30", "2026-11-02")).toBe(3);
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2);
    expect(daysBetween("2026-11-05", "2026-11-04")).toBe(-1);
  });
});

describe("weekDays", () => {
  const courses = [
    { session_date: "2026-11-05", id: "a" },
    { session_date: "2026-11-02", id: "b" },
  ];
  it("lundi → vendredi de la semaine en cours, séances rangées par jour", () => {
    const { days, nextWeek } = weekDays("2026-11-04", courses);
    expect(nextWeek).toBe(false);
    expect(days.map((d) => d.label)).toEqual(["LUN", "MAR", "MER", "JEU", "VEN"]);
    expect(days.map((d) => d.day)).toEqual([2, 3, 4, 5, 6]);
    expect(days.find((d) => d.isToday)?.label).toBe("MER");
    expect(days[3].courses.map((c) => c.id)).toEqual(["a"]);
    expect(days[0].courses.map((c) => c.id)).toEqual(["b"]);
  });
  it("le week-end, montre la semaine suivante", () => {
    expect(weekDays("2026-11-07", []).days[0].date).toBe("2026-11-09");
    expect(weekDays("2026-11-08", []).days[0].date).toBe("2026-11-09");
    expect(weekDays("2026-11-07", []).nextWeek).toBe(true);
    expect(weekRange("2026-11-04")).toEqual({ from: "2026-11-02", to: "2026-11-06" });
  });
});
