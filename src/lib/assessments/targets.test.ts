import { describe, expect, it } from "vitest";

import { gradingTargets } from "./targets";

const s = (id: string, last_name: string, first_name = "A") => ({ id, first_name, last_name });

const groups = [
  { id: "g2", name: "Projet 2", members: [s("b", "Martin"), s("c", "Durand")] },
  { id: "g1", name: "Projet 1", members: [s("a", "Petit"), s("b", "Martin")] },
  { id: "g3", name: "Projet 3", members: [] },
];

describe("gradingTargets", () => {
  it("note de groupe : un formulaire par groupe visé, triés par nom", () => {
    const targets = gradingTargets(true, groups);
    expect(targets.map((t) => t.group.id)).toEqual(["g1", "g2", "g3"]);
    expect(targets.every((t) => t.students.length === 0)).toBe(true);
  });

  it("note individuelle : un formulaire par membre, sans doublon entre groupes", () => {
    const targets = gradingTargets(false, groups);
    expect(targets.map((t) => [t.group.id, t.students.map((m) => m.id)])).toEqual([
      ["g1", ["b", "a"]],
      ["g2", ["c"]],
      ["g3", []],
    ]);
  });

  it("aucun groupe : aucun formulaire", () => {
    expect(gradingTargets(false, [])).toEqual([]);
  });
});
