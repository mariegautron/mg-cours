import { describe, expect, it } from "vitest";

import {
  firstWaiting,
  formatClock,
  isOralAssessment,
  moveSlot,
  nextWaiting,
  oralSchedule,
  orderOral,
  parseClock,
  slotDuration,
} from "./oral";

const groups = ["g1", "g2", "g3", "g4", "g5"];

describe("orderOral", () => {
  it("volontaires d'abord, dans l'ordre noté, puis les autres tirés", () => {
    const order = orderOral({ groupIds: groups, volunteers: ["g4", "g2"], seed: "s" });
    expect(order.slice(0, 2)).toEqual([
      { groupId: "g4", method: "volunteer" },
      { groupId: "g2", method: "volunteer" },
    ]);
    expect(order.slice(2).every((o) => o.method === "draw")).toBe(true);
    expect(order.map((o) => o.groupId).sort()).toEqual([...groups].sort());
  });

  it("reproductible avec la même graine, quel que soit l'ordre des groupes", () => {
    const a = orderOral({ groupIds: groups, volunteers: [], seed: "abc" });
    const b = orderOral({ groupIds: [...groups].reverse(), volunteers: [], seed: "abc" });
    expect(b).toEqual(a);
  });

  it("une autre graine change l'ordre (sur quelques essais)", () => {
    const base = JSON.stringify(orderOral({ groupIds: groups, volunteers: [], seed: "s1" }));
    const others = ["s2", "s3", "s4", "s5"].map((seed) =>
      JSON.stringify(orderOral({ groupIds: groups, volunteers: [], seed })),
    );
    expect(others.some((o) => o !== base)).toBe(true);
  });

  it("ignore les volontaires inconnus et les doublons", () => {
    const order = orderOral({ groupIds: ["a", "b"], volunteers: ["zzz", "b", "b"], seed: "s" });
    expect(order).toEqual([
      { groupId: "b", method: "volunteer" },
      { groupId: "a", method: "draw" },
    ]);
  });
});

describe("créneaux", () => {
  it("durée : créneau, puis évaluation, puis 15 minutes", () => {
    expect(slotDuration(10, 20)).toBe(10);
    expect(slotDuration(null, 20)).toBe(20);
    expect(slotDuration(null, null)).toBe(15);
    expect(slotDuration(0, 0)).toBe(15);
  });

  it("horaires mis bout à bout", () => {
    expect(oralSchedule("09:00", [15, 20, 15])).toEqual([
      { start: "09:00", end: "09:15", minutes: 15 },
      { start: "09:15", end: "09:35", minutes: 20 },
      { start: "09:35", end: "09:50", minutes: 15 },
    ]);
  });

  it("sans heure de début : durées seules", () => {
    expect(oralSchedule(null, [15])).toEqual([{ start: null, end: null, minutes: 15 }]);
  });

  it("lit les heures avec ou sans secondes et refuse le reste", () => {
    expect(parseClock("09:30:00")).toBe(570);
    expect(parseClock("9:05")).toBe(545);
    expect(parseClock("25:00")).toBeNull();
    expect(parseClock("abc")).toBeNull();
    expect(formatClock(23 * 60 + 50 + 20)).toBe("00:10");
  });
});

describe("groupe suivant", () => {
  const slots = [
    { id: "a", status: "done" as const },
    { id: "b", status: "waiting" as const },
    { id: "c", status: "done" as const },
    { id: "d", status: "waiting" as const },
  ];

  it("premier groupe pas encore passé", () => {
    expect(firstWaiting(slots)?.id).toBe("b");
    expect(firstWaiting(slots.map((s) => ({ ...s, status: "done" as const })))).toBeNull();
  });

  it("suivant : saute ceux qui sont passés, null au dernier", () => {
    expect(nextWaiting(slots, "b")?.id).toBe("d");
    expect(nextWaiting(slots, "d")).toBeNull();
    expect(nextWaiting(slots, "inconnu")?.id).toBe("b");
  });

  it("déplacer un créneau échange avec son voisin, sans sortir des bornes", () => {
    expect(moveSlot(slots, "b", -1).map((s) => s.id)).toEqual(["b", "a", "c", "d"]);
    expect(moveSlot(slots, "a", -1).map((s) => s.id)).toEqual(["a", "b", "c", "d"]);
    expect(moveSlot(slots, "d", 1).map((s) => s.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("isOralAssessment", () => {
  it("note de groupe : rôle oral du projet ou type « oral »", () => {
    expect(isOralAssessment({ is_group_grade: true, project_role: "oral", type: null })).toBe(true);
    expect(isOralAssessment({ is_group_grade: true, project_role: null, type: "Oral final" })).toBe(
      true,
    );
    expect(
      isOralAssessment({ is_group_grade: true, project_role: "milestone", type: "projet" }),
    ).toBe(false);
    expect(isOralAssessment({ is_group_grade: false, project_role: "oral", type: "oral" })).toBe(
      false,
    );
  });
});
