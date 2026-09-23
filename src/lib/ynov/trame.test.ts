import { describe, expect, it } from "vitest";

import { trameDueDate, trameStatus } from "./trame";

describe("trameDueDate", () => {
  it("= 1re séance − 15 jours", () => {
    expect(trameDueDate("2026-10-12").toISOString().slice(0, 10)).toBe("2026-09-27");
  });
});

describe("trameStatus", () => {
  const state = "module_created" as const;

  it("sent si l'état iceberg a dépassé outline_sent, quelle que soit la date", () => {
    const s = trameStatus("2026-10-12", "outline_sent", new Date("2026-09-01"));
    expect(s.level).toBe("sent");
  });

  it("unknown sans date de 1re séance", () => {
    expect(trameStatus(null, state).level).toBe("unknown");
  });

  it("ok si l'échéance est à plus de 15 jours", () => {
    const s = trameStatus("2026-10-12", state, new Date("2026-09-01")); // due 09-27, 26j restants
    expect(s.level).toBe("ok");
    expect(s.daysUntilDue).toBe(26);
  });

  it("warning entre J-15 et J-8", () => {
    const s = trameStatus("2026-10-12", state, new Date("2026-09-15")); // due 09-27, 12j
    expect(s.level).toBe("warning");
  });

  it("urgent entre J-7 et J-0", () => {
    const s = trameStatus("2026-10-12", state, new Date("2026-09-22")); // due 09-27, 5j
    expect(s.level).toBe("urgent");
  });

  it("overdue après l'échéance", () => {
    const s = trameStatus("2026-10-12", state, new Date("2026-09-30")); // due 09-27, -3j
    expect(s.level).toBe("overdue");
    expect(s.daysUntilDue).toBe(-3);
  });
});
