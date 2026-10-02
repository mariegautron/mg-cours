import { describe, expect, it } from "vitest";

import { sessionReadiness, type ReadinessInput } from "./readiness";

const ready: ReadinessInput = {
  moduleId: "m1",
  courseId: "c1",
  prepStatus: "ready",
  resources: [{ status: "ready" }, { status: "ready" }],
  groupCount: 3,
  students: { total: 15, withPhoto: 15 },
};

const item = (i: ReadinessInput, key: string) =>
  sessionReadiness(i).items.find((x) => x.key === key)!;

describe("sessionReadiness", () => {
  it("tout est prêt : quatre points valides, aucune action", () => {
    const r = sessionReadiness(ready);
    expect(r.allReady).toBe(true);
    expect(r.readyCount).toBe(4);
    expect(r.items.every((x) => x.ok && !x.action)).toBe(true);
  });
  it("déroulé non prêt : lien vers la séance", () => {
    const x = item({ ...ready, prepStatus: "draft" }, "outline");
    expect(x.ok).toBe(false);
    expect(x.action?.href).toBe("/modules/m1/courses/c1/edit");
  });
  it("ressources : aucune, à construire, toutes prêtes", () => {
    expect(item({ ...ready, resources: [] }, "resources").title).toBe("Aucune ressource attachée");
    const part = item(
      { ...ready, resources: [{ status: "ready" }, { status: "progress" }, { status: "ready" }] },
      "resources",
    );
    expect(part.ok).toBe(false);
    expect(part.title).toBe("2 ressources prêtes sur 3");
    expect(part.detail).toContain("1 ressource à construire");
    expect(item(ready, "resources").title).toBe("2 ressources prêtes");
  });
  it("groupes : aucun → lien de création", () => {
    const x = item({ ...ready, groupCount: 0 }, "groups");
    expect(x.ok).toBe(false);
    expect(x.action?.href).toBe("/modules/m1/groups/new");
    expect(item({ ...ready, groupCount: 1 }, "groups").title).toBe("1 groupe constitué");
  });
  it("trombinoscope : personne, photos manquantes, complet", () => {
    expect(item({ ...ready, students: { total: 0, withPhoto: 0 } }, "photos").ok).toBe(false);
    const x = item({ ...ready, students: { total: 15, withPhoto: 12 } }, "photos");
    expect(x.title).toBe("3 photos manquantes sur 15");
    expect(x.action?.href).toBe("/students/photos");
    expect(item(ready, "photos").ok).toBe(true);
  });
  it("compte les points prêts", () => {
    const r = sessionReadiness({ ...ready, prepStatus: "draft", groupCount: 0 });
    expect(r.readyCount).toBe(2);
    expect(r.allReady).toBe(false);
  });
});
