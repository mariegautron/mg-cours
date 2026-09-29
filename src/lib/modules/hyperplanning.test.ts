import { describe, expect, it } from "vitest";

import { trameStatus } from "@/lib/ynov/trame";

import {
  describeDateChanges,
  matchServices,
  moduleDatesFromSlots,
  normalizeModuleName,
  parseHyperplanningServices,
  readModuleDates,
  slotsToSessions,
  summarizeModuleDates,
} from "./hyperplanning";

const AGILE = `Méthodologies Agile & Scrum
Nantes | DEVFLSTK MAST1 21h00
Nantes | DEVFLSTK MAST1 21h00
3h00 lun. 12/10/2026 08h00
1h00 lun. 12/10/2026 11h00
3h00 lun. 12/10/2026 13h00
3h00 lun. 02/11/2026 08h00
1h00 lun. 02/11/2026 11h00
3h00 lun. 02/11/2026 13h00
4h00 mar. 03/11/2026 08h00
3h00 mar. 03/11/2026 13h00`;

const CADRAGE = `Cadrage de projet
Nantes | DEVFLSTK MAST2 10h00
2h30 mer. 14/10/2026 09h00
2h30 jeu. 15/10/2026 09h00
2h30 ven. 16/10/2026 09h00
2h30 sam. 17/10/2026 09h00`;

const HEADER = "NANTES YNOV CAMPUS\nIndex Éducation - Hyperplanning";
const FOOTER = "Page 1 / 2";

describe("parseHyperplanningServices", () => {
  it("lit la fixture : un bloc, 21 h, 8 créneaux, lignes dupliquées ignorées", () => {
    const { services, warnings } = parseHyperplanningServices(`${HEADER}\n${AGILE}\n${FOOTER}`);
    expect(warnings).toEqual([]);
    expect(services).toHaveLength(1);
    expect(services[0]).toMatchObject({
      name: "Méthodologies Agile & Scrum",
      audience: "Nantes | DEVFLSTK MAST1",
      totalHours: 21,
    });
    expect(services[0].slots).toHaveLength(8);
    expect(services[0].slots[0]).toEqual({ date: "2026-10-12", start: "08:00", hours: 3 });
    expect(services[0].slots[1]).toEqual({ date: "2026-10-12", start: "11:00", hours: 1 });
  });

  it("lit plusieurs matières, les jours abrégés et une page répétée avec en-tête et pied de page", () => {
    const repeated = `${HEADER}\n${AGILE}\n${FOOTER}\n${HEADER}\n${CADRAGE}\n${FOOTER}\n${HEADER}\n${AGILE}`;
    const { services, warnings } = parseHyperplanningServices(repeated);
    expect(warnings).toEqual([]);
    expect(services.map((s) => s.name)).toEqual([
      "Méthodologies Agile & Scrum",
      "Cadrage de projet",
    ]);
    expect(services[0].slots).toHaveLength(8);
    expect(services[1]).toMatchObject({ audience: "Nantes | DEVFLSTK MAST2", totalHours: 10 });
    expect(services[1].slots.map((s) => s.date)).toEqual([
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
    ]);
  });

  it("tolère les jours dim. et les fins de ligne Windows, sans nom d'intervenant", () => {
    const { services } = parseHyperplanningServices(
      "Design\r\nNantes | B3 DESIGN 2h00\r\n2h00 dim. 01/11/2026 14h00\r\n",
    );
    expect(services[0].slots).toEqual([{ date: "2026-11-01", start: "14:00", hours: 2 }]);
  });

  it("avertit quand les créneaux ne font pas les heures déclarées", () => {
    const short = AGILE.split("\n").slice(0, -1).join("\n");
    const { warnings } = parseHyperplanningServices(short);
    expect(warnings).toEqual([
      "« Méthodologies Agile & Scrum » : les créneaux totalisent 18 h pour 21 h annoncées.",
    ]);
  });

  it("ignore une date impossible et un texte sans créneau", () => {
    expect(parseHyperplanningServices("Bonjour").services).toEqual([]);
    const { services } = parseHyperplanningServices(
      "X\nNantes | C 1h00\n1h00 lun. 31/02/2026 08h00",
    );
    expect(services[0].slots).toEqual([]);
  });
});

describe("slotsToSessions", () => {
  const { services } = parseHyperplanningServices(AGILE);
  const slots = services[0].slots;

  it("fusionne les créneaux consécutifs d'une même journée : 6 séances de 4 h, 3 h, 4 h, 3 h, 4 h, 3 h", () => {
    const sessions = slotsToSessions(slots);
    expect(sessions).toEqual([
      { date: "2026-10-12", startTime: "08:00", endTime: "12:00" },
      { date: "2026-10-12", startTime: "13:00", endTime: "16:00" },
      { date: "2026-11-02", startTime: "08:00", endTime: "12:00" },
      { date: "2026-11-02", startTime: "13:00", endTime: "16:00" },
      { date: "2026-11-03", startTime: "08:00", endTime: "12:00" },
      { date: "2026-11-03", startTime: "13:00", endTime: "16:00" },
    ]);
  });

  it("garde un créneau par séance en mode « séparées »", () => {
    expect(slotsToSessions(slots, "separate")).toHaveLength(8);
  });

  it("ne fusionne pas des créneaux séparés par une pause ni de jours différents", () => {
    const out = slotsToSessions([
      { date: "2026-10-12", start: "08:00", hours: 2 },
      { date: "2026-10-12", start: "10:30", hours: 1 },
      { date: "2026-10-13", start: "11:30", hours: 1 },
    ]);
    expect(out).toHaveLength(3);
  });
});

describe("moduleDatesFromSlots", () => {
  it("début et 1re séance = premier créneau, fin = dernier", () => {
    const { services } = parseHyperplanningServices(AGILE);
    const dates = moduleDatesFromSlots(services[0].slots);
    expect(dates).toEqual({
      startDate: "2026-10-12",
      firstSessionDate: "2026-10-12",
      endDate: "2026-11-03",
    });
    expect(summarizeModuleDates(dates)).toBe(
      "début 12/10/2026 · 1re séance 12/10/2026 · fin 03/11/2026",
    );
  });

  it("renvoie des dates vides sans créneau", () => {
    expect(moduleDatesFromSlots([])).toEqual({
      startDate: null,
      firstSessionDate: null,
      endDate: null,
    });
  });

  it("la 1re séance recalcule l'échéance et le badge d'alerte de la progression", () => {
    const { firstSessionDate } = moduleDatesFromSlots([
      { date: "2026-10-12" },
      { date: "2026-11-03" },
    ]);
    const status = trameStatus(
      firstSessionDate,
      "module_created",
      new Date("2026-09-29T10:00:00Z"),
    );
    expect(status.dueDate?.toISOString().slice(0, 10)).toBe("2026-09-27");
    expect(status.level).toBe("overdue");
    const later = trameStatus("2026-11-02", "module_created", new Date("2026-09-29T10:00:00Z"));
    expect(later.level).toBe("ok");
  });
});

describe("describeDateChanges", () => {
  const proposed = {
    startDate: "2026-10-12",
    firstSessionDate: "2026-10-12",
    endDate: "2026-11-03",
  };

  it("montre l'écart avant d'écraser une date existante", () => {
    expect(
      describeDateChanges(
        { startDate: null, firstSessionDate: "2026-10-05", endDate: "2026-11-03" },
        proposed,
      ),
    ).toEqual([
      "Le début serait fixé au 12/10/2026.",
      "La 1re séance passerait du 05/10/2026 au 12/10/2026.",
    ]);
  });

  it("ne dit rien quand les dates sont identiques", () => {
    expect(describeDateChanges(proposed, proposed)).toEqual([]);
  });
});

describe("readModuleDates", () => {
  it("lit les dates confirmées, refuse le reste", () => {
    expect(readModuleDates("")).toBeUndefined();
    expect(
      readModuleDates('{"startDate":"2026-10-12","firstSessionDate":"2026-10-12","endDate":null}'),
    ).toEqual({ startDate: "2026-10-12", firstSessionDate: "2026-10-12", endDate: null });
    expect(
      readModuleDates('{"startDate":"2026-02-31","firstSessionDate":null,"endDate":null}'),
    ).toBeNull();
    expect(readModuleDates("pas du json")).toBeNull();
  });
});

describe("matchServices", () => {
  const { services } = parseHyperplanningServices(`${AGILE}\n${CADRAGE}`);

  it("retrouve le module par son nom, sans tenir compte des accents, de la casse ni du « & »", () => {
    expect(matchServices(services, "methodologies agile et SCRUM").map((s) => s.name)).toEqual([
      "Méthodologies Agile & Scrum",
    ]);
    expect(matchServices(services, "Méthodologies  Agile & Scrum")).toHaveLength(1);
  });

  it("ne renvoie rien pour un nom vide ou inconnu (l'interface propose alors la liste)", () => {
    expect(matchServices(services, "")).toEqual([]);
    expect(matchServices(services, "   ")).toEqual([]);
    expect(matchServices(services, "Algorithmique")).toEqual([]);
  });

  it("normalise les noms", () => {
    expect(normalizeModuleName("Éthique & Droit")).toBe("ethique et droit");
  });
});
