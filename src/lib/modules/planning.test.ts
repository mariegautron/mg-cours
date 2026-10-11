import { describe, expect, it } from "vitest";

import { buildPlanning } from "@/lib/modules/planning";

const base = { assessments: [] as never[], endTime: "12:00:00", sessionDate: "2026-11-03" };

describe("buildPlanning", () => {
  it("trie les jours et signale les pauses entre les activités", () => {
    const days = buildPlanning([
      {
        ...base,
        id: "b",
        position: 6,
        title: "Oral",
        startTime: "13:00:00",
        endTime: "16:00:00",
        items: [{ title: "Oral", startTime: "13:00:00", minutes: 180 }],
      },
      {
        ...base,
        id: "a",
        position: 5,
        title: "Kanban",
        startTime: "08:00:00",
        items: [
          { title: "Kanban", startTime: "08:00:00", minutes: 50 },
          { title: "QCM", startTime: "09:30:00", minutes: 45 },
        ],
      },
    ]);
    expect(days).toHaveLength(1);
    expect(days[0].sessions.map((s) => s.position)).toEqual([5, 6]);
    expect(days[0].sessions[0].rows.map((r) => `${r.kind} ${r.start}-${r.end}`)).toEqual([
      "item 08:00-08:50",
      "pause 08:50-09:30",
      "item 09:30-10:15",
      "pause 10:15-12:00",
    ]);
  });

  it("garde les ressources sans horaire à part", () => {
    const [day] = buildPlanning([
      {
        ...base,
        id: "c",
        position: 1,
        title: "S1",
        startTime: "08:00:00",
        items: [{ title: "Sans horaire", startTime: null, minutes: null }],
      },
    ]);
    expect(day.sessions[0].unscheduled).toEqual(["Sans horaire"]);
  });
});
