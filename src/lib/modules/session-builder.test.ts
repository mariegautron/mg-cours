import { describe, expect, it } from "vitest";

import {
  cleanDeliverable,
  moveDown,
  moveUp,
  orderResources,
  reorder,
  sessionStatus,
} from "./session-builder";

describe("reorder", () => {
  it("déplace un élément, sans modifier la liste d'origine", () => {
    const list = ["a", "b", "c", "d"];
    expect(reorder(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(reorder(list, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(list).toEqual(["a", "b", "c", "d"]);
  });
  it("rangs hors bornes ou identiques : inchangé", () => {
    expect(reorder(["a", "b"], 0, 5)).toEqual(["a", "b"]);
    expect(reorder(["a", "b"], -1, 0)).toEqual(["a", "b"]);
    expect(reorder(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });
  it("monter / descendre, sans effet aux extrémités", () => {
    expect(moveUp(["a", "b", "c"], 1)).toEqual(["b", "a", "c"]);
    expect(moveUp(["a", "b", "c"], 0)).toEqual(["a", "b", "c"]);
    expect(moveDown(["a", "b", "c"], 1)).toEqual(["a", "c", "b"]);
    expect(moveDown(["a", "b", "c"], 2)).toEqual(["a", "b", "c"]);
  });
});

describe("orderResources", () => {
  const rs = [{ id: "a" }, { id: "b" }, { id: "c" }];
  it("ordre voulu d'abord, le reste à la suite dans l'ordre d'origine", () => {
    expect(orderResources(rs, ["c", "a"]).map((r) => r.id)).toEqual(["c", "a", "b"]);
  });
  it("ressources retirées, doublons et inconnues ignorés", () => {
    expect(orderResources(rs, ["zzz", "b", "b"]).map((r) => r.id)).toEqual(["b", "a", "c"]);
  });
  it("sans ordre : inchangé", () => {
    expect(orderResources(rs, null).map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(orderResources(rs, []).map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
});

describe("sessionStatus", () => {
  it("faite par la clôture, sinon prête ou à préparer", () => {
    expect(sessionStatus({ prep_status: "todo", completion: "done" })).toBe("done");
    expect(sessionStatus({ prep_status: "ready", completion: "partial" })).toBe("done");
    expect(sessionStatus({ prep_status: "ready", completion: null })).toBe("ready");
    expect(sessionStatus({ prep_status: "todo", completion: "not_done" })).toBe("to_prepare");
    expect(sessionStatus({ prep_status: "draft", completion: null })).toBe("to_prepare");
  });
});

describe("cleanDeliverable", () => {
  it("nettoie, refuse au-delà de la limite", () => {
    expect(cleanDeliverable("  Carte des acteurs\r\n")).toEqual({
      ok: true,
      text: "Carte des acteurs",
    });
    expect(cleanDeliverable("x".repeat(2001)).ok).toBe(false);
  });
});
