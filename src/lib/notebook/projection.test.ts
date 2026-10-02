import { describe, expect, it } from "vitest";

import {
  endedEarly,
  minutesOf,
  projectionRecap,
  type PlannedSection,
  type ProjectionEventInput,
} from "./projection";

const planned: PlannedSection[] = [
  { key: "resource:a", title: "Cours : Backlog" },
  { key: "resource:b", title: "Atelier : planning poker" },
  { key: "subject:J1", title: "Sujet — Jalon 1" },
];
const ev = (
  sectionKey: string | null,
  at: string,
  extra: Partial<ProjectionEventInput> = {},
): ProjectionEventInput => ({
  sectionKey,
  resourceId: null,
  kind: "projected",
  projectedAt: `2026-11-02T${at}:00Z`,
  ...extra,
});

describe("projectionRecap", () => {
  it("aucune projection : rien d'enregistré, tout est à indiquer à la main", () => {
    const r = projectionRecap({ planned, events: [] });
    expect(r.status).toBe("none");
    expect(r.missing).toHaveLength(3);
    expect(r.suggestedCarryOver).toContain("Cours : Backlog");
  });

  it("pile : tout projeté dans l'ordre prévu", () => {
    const r = projectionRecap({
      planned,
      events: [ev("resource:a", "08:10"), ev("resource:b", "09:00"), ev("subject:J1", "10:30")],
    });
    expect(r.status).toBe("on_time");
    expect(r.missing).toEqual([]);
    expect(r.orderChanged).toBe(false);
    expect(r.suggestedCarryOver).toBe("");
  });

  it("en retard : des sections prévues non projetées, proposées au report", () => {
    const r = projectionRecap({
      planned,
      events: [ev("resource:a", "08:10"), ev("subject:J1", "10:30")],
    });
    expect(r.status).toBe("late");
    expect(r.missing.map((m) => m.key)).toEqual(["resource:b"]);
    expect(r.suggestedCarryOver).toBe("Atelier : planning poker");
    expect(r.sentence).toContain("1 élément prévu n’a pas été projeté");
  });

  it("ordre changé : mêmes sections, ordre différent", () => {
    const r = projectionRecap({
      planned,
      events: [ev("subject:J1", "08:10"), ev("resource:a", "09:00"), ev("resource:b", "10:30")],
    });
    expect(r.status).toBe("reordered");
    expect(r.orderChanged).toBe(true);
    expect(r.projected.map((p) => p.key)).toEqual(["subject:J1", "resource:a", "resource:b"]);
  });

  it("en avance : tout projeté et séance terminée avant l'heure prévue", () => {
    const r = projectionRecap({
      planned,
      events: [ev("resource:a", "08:10"), ev("resource:b", "09:00"), ev("subject:J1", "09:30")],
      endedEarly: true,
    });
    expect(r.status).toBe("early");
  });

  it("en avance : une ressource de la séance suivante déjà projetée", () => {
    const r = projectionRecap({
      planned,
      events: [
        ev("resource:a", "08:10"),
        ev("resource:b", "09:00"),
        ev("subject:J1", "09:30"),
        ev(null, "11:40", { resourceId: "next-1" }),
      ],
      nextSessionResourceIds: ["next-1"],
    });
    expect(r.status).toBe("early");
    expect(r.sentence).toContain("séance suivante");
  });

  it("une section non projetée l'emporte sur l'avance : « en retard »", () => {
    const r = projectionRecap({
      planned,
      events: [ev("resource:a", "08:10"), ev(null, "11:40", { resourceId: "next-1" })],
      nextSessionResourceIds: ["next-1"],
      endedEarly: true,
    });
    expect(r.status).toBe("late");
    expect(r.missing).toHaveLength(2);
  });

  it("événements dupliqués ou section projetée deux fois : la première projection fait foi", () => {
    const r = projectionRecap({
      planned,
      events: [
        ev("resource:a", "08:10"),
        ev("resource:a", "08:10"),
        ev("resource:b", "09:00"),
        ev("resource:a", "09:40"),
        ev("subject:J1", "10:30"),
      ],
    });
    expect(r.status).toBe("on_time");
    expect(r.projected).toHaveLength(3);
    expect(r.projected[0].at).toBe("2026-11-02T08:10:00Z");
  });

  it("« Pour moi » ne compte pas comme projeté", () => {
    const r = projectionRecap({
      planned,
      events: [
        ev("resource:a", "08:10", { kind: "private" }),
        ev("resource:b", "09:00"),
        ev("subject:J1", "10:30"),
      ],
    });
    expect(r.status).toBe("late");
    expect(r.missing.map((m) => m.key)).toEqual(["resource:a"]);
  });

  it("sections supprimées entre-temps : ignorées dans le statut, signalées à part", () => {
    const r = projectionRecap({
      planned,
      events: [
        ev("resource:gone", "08:00"),
        ev("resource:a", "08:10"),
        ev("resource:b", "09:00"),
        ev("subject:J1", "10:30"),
      ],
    });
    expect(r.status).toBe("on_time");
    expect(r.unknownKeys).toEqual(["resource:gone"]);
  });

  it("section prévue supprimée : ne compte pas comme manquante", () => {
    const r = projectionRecap({
      planned: planned.slice(0, 2),
      events: [ev("resource:a", "08:10"), ev("resource:b", "09:00"), ev("subject:J1", "10:30")],
    });
    expect(r.status).toBe("on_time");
    expect(r.unknownKeys).toEqual(["subject:J1"]);
  });

  it("déroulé vide : pile (ou en avance si la séance suivante est entamée)", () => {
    expect(projectionRecap({ planned: [], events: [] }).status).toBe("on_time");
    expect(
      projectionRecap({
        planned: [],
        events: [ev(null, "08:00", { resourceId: "n" })],
        nextSessionResourceIds: ["n"],
      }).status,
    ).toBe("early");
  });

  it("dates invalides ignorées, égalité de date : ordre prévu", () => {
    const r = projectionRecap({
      planned,
      events: [
        {
          sectionKey: "resource:b",
          resourceId: null,
          kind: "projected",
          projectedAt: "n'importe quoi",
        },
        ev("resource:b", "09:00"),
        ev("resource:a", "09:00"),
        ev("subject:J1", "10:00"),
      ],
    });
    expect(r.status).toBe("on_time");
    expect(r.projected.map((p) => p.key)).toEqual(["resource:a", "resource:b", "subject:J1"]);
  });
});

describe("endedEarly / minutesOf", () => {
  it("lit les heures HH:MM et HH:MM:SS", () => {
    expect(minutesOf("12:00")).toBe(720);
    expect(minutesOf("08:05:00")).toBe(485);
    expect(minutesOf(null)).toBeNull();
    expect(minutesOf("midi")).toBeNull();
  });
  it("en avance seulement avec une marge de 10 minutes", () => {
    expect(endedEarly(11 * 60 + 40, "12:00")).toBe(true);
    expect(endedEarly(11 * 60 + 50, "12:00")).toBe(true);
    expect(endedEarly(11 * 60 + 55, "12:00")).toBe(false);
    expect(endedEarly(10 * 60, null)).toBe(false);
  });
});
