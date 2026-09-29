import { describe, expect, it } from "vitest";

import {
  clampIndex,
  clockInParis,
  minutesInParis,
  parseSyncMessage,
  remainingLabel,
  syncChannelName,
} from "./sync";

describe("parseSyncMessage", () => {
  it("accepte les trois messages attendus", () => {
    expect(parseSyncMessage({ type: "hello" })).toEqual({ type: "hello" });
    expect(parseSyncMessage({ type: "go", index: 3 })).toEqual({ type: "go", index: 3 });
    expect(parseSyncMessage({ type: "state", index: 1, total: 8 })).toEqual({
      type: "state",
      index: 1,
      total: 8,
    });
  });

  it("ignore tout le reste, y compris des champs en trop ou mal typés", () => {
    for (const bad of [
      null,
      "go",
      42,
      {},
      { type: "go" },
      { type: "go", index: -1 },
      { type: "go", index: 1.5 },
      { type: "go", index: "2" },
      { type: "state", index: 0, total: 0 },
      { type: "state", index: 0 },
      { type: "autre", index: 0 },
    ]) {
      expect(parseSyncMessage(bad)).toBeNull();
    }
  });

  it("ne laisse passer que des indices : aucun contenu ne circule", () => {
    const msg = parseSyncMessage({ type: "go", index: 2, notes: "SECRET", title: "x" });
    expect(msg).toEqual({ type: "go", index: 2 });
  });
});

describe("syncChannelName / clampIndex", () => {
  it("un canal par séance", () => {
    expect(syncChannelName("abc")).not.toBe(syncChannelName("def"));
  });

  it("garde l'index dans le diaporama", () => {
    expect(clampIndex(9, 4)).toBe(3);
    expect(clampIndex(-2, 4)).toBe(0);
    expect(clampIndex(2, 0)).toBe(0);
  });
});

describe("horloge à Paris", () => {
  it("convertit l'heure d'été et l'heure d'hiver", () => {
    expect(clockInParis(new Date("2026-10-12T12:32:00Z"))).toBe("14:32"); // UTC+2
    expect(clockInParis(new Date("2026-11-12T12:32:00Z"))).toBe("13:32"); // UTC+1
    expect(minutesInParis(new Date("2026-10-12T21:59:00Z"))).toBe(23 * 60 + 59);
  });
});

describe("remainingLabel", () => {
  const at = (h: number, m: number) => h * 60 + m;

  it("indique le temps restant, y compris les secondes de Postgres", () => {
    expect(remainingLabel(at(10, 0), "12:00:00")).toBe("Il reste 2 h");
    expect(remainingLabel(at(11, 12), "12:00")).toBe("Il reste 48 min");
    expect(remainingLabel(at(10, 30), "12:05")).toBe("Il reste 1 h 35");
  });

  it("annonce l'heure de finir puis le dépassement", () => {
    expect(remainingLabel(at(12, 0), "12:00")).toBe("C’est l’heure de finir");
    expect(remainingLabel(at(12, 5), "12:00")).toBe("Séance terminée depuis 5 min");
  });

  it("ne dit rien sans heure de fin", () => {
    expect(remainingLabel(at(10, 0), null)).toBeNull();
    expect(remainingLabel(at(10, 0), "abc")).toBeNull();
  });
});
