import { describe, expect, it } from "vitest";

import {
  describeGroupPlan,
  filterStudents,
  planGroupImport,
  promotionOf,
  readGroupMode,
} from "./module-groups";

const rows = [
  { rowNumber: 2, scholarGroup: "TP1" },
  { rowNumber: 3, scholarGroup: "tp1" },
  { rowNumber: 4, scholarGroup: "TP2" },
  { rowNumber: 5, scholarGroup: null },
];

describe("readGroupMode / promotionOf", () => {
  it("promotion par défaut", () => {
    expect(readGroupMode(undefined)).toBe("promotion");
    expect(readGroupMode("module_group")).toBe("module_group");
    expect(promotionOf({ scholarGroup: "M1" }, "promotion")).toBe("M1");
    expect(promotionOf({ scholarGroup: "M1" }, "module_group")).toBeNull();
  });
});

describe("planGroupImport", () => {
  it("mode promotion : aucune appartenance sans ajout global", () => {
    const plan = planGroupImport(rows, { mode: "promotion", allGroupName: "" }, []);
    expect(plan.memberships).toEqual([]);
    expect(describeGroupPlan(plan)).toBe("Aucun ajout à un groupe du module.");
  });

  it("mode groupe du module : reconnaît les groupes existants (casse, accents) et crée les autres", () => {
    const plan = planGroupImport(rows, { mode: "module_group", allGroupName: "" }, [
      { name: "TP1" },
    ]);
    expect(plan.memberships).toEqual([
      { rowNumber: 2, groupName: "TP1" },
      { rowNumber: 3, groupName: "TP1" },
      { rowNumber: 4, groupName: "TP2" },
    ]);
    expect(plan.groups).toEqual([
      { name: "TP1", isNew: false, count: 2 },
      { name: "TP2", isNew: true, count: 1 },
    ]);
    expect(describeGroupPlan(plan)).toBe(
      "1 groupe à créer (TP2), 1 existant (TP1) ; 3 appartenances.",
    );
  });

  it("ajoute tout le monde à un groupe, en plus de la colonne, sans doublon", () => {
    const plan = planGroupImport(
      rows,
      { mode: "module_group", allGroupName: "  Classe   entière " },
      [],
    );
    expect(plan.memberships.filter((m) => m.groupName === "Classe entière")).toHaveLength(4);
    expect(plan.groups.find((g) => g.name === "Classe entière")).toMatchObject({
      isNew: true,
      count: 4,
    });
    const same = planGroupImport(rows, { mode: "module_group", allGroupName: "tp1" }, []);
    expect(same.memberships.filter((m) => m.rowNumber === 2)).toHaveLength(1);
  });

  it("ajout global seul en mode promotion", () => {
    const plan = planGroupImport(rows, { mode: "promotion", allGroupName: "Tous" }, []);
    expect(plan.memberships).toHaveLength(4);
  });
});

describe("filterStudents", () => {
  const students = [
    { first_name: "Élodie", last_name: "Martin", email: "e.martin@x.fr", student_number: "A12" },
    { first_name: "Karim", last_name: "Durand", email: null, student_number: null },
  ];
  it("cherche sans accent, dans les deux ordres, par e-mail ou numéro", () => {
    expect(filterStudents(students, "elodie")).toHaveLength(1);
    expect(filterStudents(students, "martin elodie")).toHaveLength(1);
    expect(filterStudents(students, "a12")).toHaveLength(1);
    expect(filterStudents(students, "x.fr")).toHaveLength(1);
    expect(filterStudents(students, "zzz")).toHaveLength(0);
    expect(filterStudents(students, " ")).toHaveLength(2);
  });
});
