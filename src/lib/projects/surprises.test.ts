import { describe, expect, it } from "vitest";

import {
  cleanSurprise,
  copyText,
  deliveryLabel,
  dueToday,
  sortSurprises,
  type Surprise,
} from "./surprises";

const s = (over: Partial<Surprise>): Surprise => ({
  id: "1",
  title: "Budget réduit",
  body: "Bonjour…",
  courseId: "c1",
  sentAt: null,
  ...over,
});

describe("cleanSurprise", () => {
  it("nettoie et refuse un titre vide ou trop long", () => {
    expect(cleanSurprise({ title: "  Budget   réduit ", body: "Mot\r\nsuite " })).toEqual({
      ok: true,
      title: "Budget réduit",
      body: "Mot\nsuite",
    });
    expect(cleanSurprise({ title: " ", body: "x" }).ok).toBe(false);
    expect(cleanSurprise({ title: "t".repeat(201), body: "" }).ok).toBe(false);
    expect(cleanSurprise({ title: "t", body: "x".repeat(5001) }).ok).toBe(false);
    expect(cleanSurprise({ title: "t", body: "" }).ok).toBe(true);
  });
});

describe("dueToday", () => {
  it("non envoyés, rattachés à une séance du jour", () => {
    const list = [
      s({ id: "a" }),
      s({ id: "b", sentAt: "2026-10-12T10:00:00Z" }),
      s({ id: "c", courseId: "c2" }),
      s({ id: "d", courseId: null }),
    ];
    expect(dueToday(list, new Set(["c1"])).map((x) => x.id)).toEqual(["a"]);
    expect(dueToday(list, new Set()).map((x) => x.id)).toEqual([]);
  });
});

describe("tri et libellés", () => {
  const order = new Map([
    ["c1", 1],
    ["c3", 3],
  ]);
  it("séance, puis sans séance, envoyés à la fin", () => {
    const list = [
      s({ id: "x", title: "Z", courseId: null }),
      s({ id: "y", title: "A", courseId: "c3" }),
      s({ id: "z", title: "B", courseId: "c1", sentAt: "2026-01-01" }),
      s({ id: "w", title: "C", courseId: "c1" }),
    ];
    expect(sortSurprises(list, order).map((i) => i.id)).toEqual(["w", "y", "x", "z"]);
  });
  it("texte à copier et libellé de séance", () => {
    expect(copyText({ title: "T", body: "  Message " })).toBe("Message");
    expect(copyText({ title: "T", body: "" })).toBe("T");
    expect(deliveryLabel("c3", order)).toBe("Séance 3");
    expect(deliveryLabel(null, order)).toBe("Pas de séance choisie");
    expect(deliveryLabel("zz", order)).toBe("Séance supprimée");
  });
});
