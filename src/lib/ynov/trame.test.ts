import { describe, expect, it } from "vitest";

import type { IcebergState } from "./iceberg";
import { outlineAlerts, outlineAlertSummary, trameDueDate, trameStatus } from "./trame";

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

describe("outlineAlerts (tableau de bord)", () => {
  const today = new Date("2026-09-27");
  const mod = (id: string, first: string | null, state: IcebergState = "module_created") => ({
    id,
    first_session_date: first,
    iceberg_state: state,
  });

  it("inclut J-15 (warning), J-7 (urgent) et le retard, triés du plus pressant au moins pressant", () => {
    const alerts = outlineAlerts(
      [
        mod("warning", "2026-10-22"), // échéance 10-07 : 10 j
        mod("ok", "2026-11-30"), // échéance 11-15 : 49 j
        mod("overdue", "2026-10-05"), // échéance 09-20 : -7 j
        mod("urgent", "2026-10-15"), // échéance 09-30 : 3 j
        mod("sent", "2026-10-15", "outline_sent"),
        mod("unknown", null),
      ],
      today,
    );
    expect(alerts.map((a) => [a.module.id, a.level, a.daysUntilDue])).toEqual([
      ["overdue", "overdue", -7],
      ["urgent", "urgent", 3],
      ["warning", "warning", 10],
    ]);
  });

  it("résumé : « Tout est en ordre » seulement sans aucune alerte", () => {
    expect(outlineAlertSummary([])).toBe("none");
    const warning = outlineAlerts([mod("w", "2026-10-22")], today);
    expect(outlineAlertSummary(warning)).toBe("upcoming");
    const urgent = outlineAlerts([mod("w", "2026-10-22"), mod("u", "2026-10-15")], today);
    expect(outlineAlertSummary(urgent)).toBe("pressing");
  });
});
