import { describe, expect, it } from "vitest";

import { hyperplanningCsv, hyperplanningRows } from "./hyperplanning";
import type { ResultSheet } from "./results";

const sheet = (over: Partial<ResultSheet>): ResultSheet =>
  ({
    recipients: [{ name: "Lea Martin", firstName: "Lea", email: null }],
    valueOn20: 14.5,
    attendance: "present",
    ...over,
  }) as ResultSheet;

describe("hyperplanningRows", () => {
  it("note sur 20 en virgule décimale, triée par nom", () => {
    const rows = hyperplanningRows([
      sheet({ recipients: [{ name: "Noa Zed", firstName: "Noa", email: null }], valueOn20: 9 }),
      sheet({}),
    ]);
    expect(rows.map((r) => [r.lastName, r.firstName, r.grade])).toEqual([
      ["Martin", "Lea", "14,50"],
      ["Zed", "Noa", "9,00"],
    ]);
  });

  it("une note de groupe donne une ligne par membre, sans doublon", () => {
    const rows = hyperplanningRows([
      sheet({
        recipients: [
          { name: "Lea Martin", firstName: "Lea", email: null },
          { name: "Noa Zed", firstName: "Noa", email: null },
        ],
      }),
    ]);
    expect(rows).toHaveLength(2);
  });

  it("absent·es : remarque claire, pas de note pour l'excusé·e, 0 pour le non prévenu", () => {
    const [excused, unexcused] = hyperplanningRows([
      sheet({ attendance: "absent_excused", valueOn20: null }),
      sheet({
        recipients: [{ name: "Zoé Zulu", firstName: "Zoé", email: null }],
        attendance: "absent_unexcused",
        valueOn20: 0,
      }),
    ]);
    expect(excused.grade).toBeNull();
    expect(excused.remark).toMatch(/excusé/);
    expect(unexcused.grade).toBe("0,00");
    expect(unexcused.remark).toMatch(/0/);
  });
});

describe("hyperplanningCsv", () => {
  it("lisible par Excel : BOM, « ; », guillemets", () => {
    const csv = hyperplanningCsv(hyperplanningRows([sheet({})]));
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"Nom";"Prénom";"Note /20";"Remarque"');
    expect(csv).toContain('"Martin";"Lea";"14,50";""');
  });
});
