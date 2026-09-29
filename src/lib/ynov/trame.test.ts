import { describe, expect, it } from "vitest";

import type { IcebergState } from "./iceberg";
import {
  alertMascotMood,
  daysLabel,
  othersLabel,
  outlineAlerts,
  outlineAlertSummary,
  trameDueDate,
  trameMessage,
  trameStatus,
} from "./trame";

describe("libellés de la progression pédagogique", () => {
  it("accorde les jours et tutoie", () => {
    expect(daysLabel(1)).toBe("1 jour");
    expect(daysLabel(12)).toBe("12 jours");
    expect(daysLabel(-3)).toBe("3 jours");
    expect(trameMessage("warning", 12)).toBe("Échéance dans 12 jours — pense à la préparer.");
    expect(trameMessage("warning", 1)).toBe("Échéance dans 1 jour — pense à la préparer.");
    expect(trameMessage("overdue", -1)).toBe(
      "Échéance dépassée depuis 1 jour — à envoyer sans attendre.",
    );
    expect(trameMessage("unknown", null)).toBe(
      "Renseigne la date de la 1re séance pour calculer l’échéance.",
    );
  });

  it("ne mélange plus J-15 et J-7 dans le message d'urgence", () => {
    const urgent = trameMessage("urgent", 5);
    expect(urgent).toBe("Échéance dans 5 jours — à envoyer rapidement.");
    expect(urgent).not.toMatch(/J-15|J-7|jour\(s\)/);
  });

  it("dit « aujourd’hui » le jour même", () => {
    expect(trameMessage("urgent", 0)).toBe("Échéance aujourd’hui — à envoyer rapidement.");
  });

  it("accorde « autre(s) »", () => {
    expect(othersLabel(1)).toBe("1 autre");
    expect(othersLabel(4)).toBe("4 autres");
  });

  it("réserve la mascotte « alert » à l'urgence (J-7, retard) ; J-15 la fait réfléchir", () => {
    expect(alertMascotMood("pressing")).toBe("alert");
    expect(alertMascotMood("upcoming")).toBe("thinking");
    expect(alertMascotMood("none")).toBe("happy");
  });
});

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
