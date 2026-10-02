import { describe, expect, it } from "vitest";

import { splitModules } from "./archive-filter";
import {
  archivedMessage,
  canUndoArchive,
  cleanRetrospective,
  NOTE_MAX,
  RESTORED_ARCHIVED_AT,
  UNDO_GRACE_MS,
  UNDO_WINDOW_MS,
} from "./archive-undo";

const at = "2026-11-02T10:00:00.000Z";
const t = Date.parse(at);

describe("canUndoArchive", () => {
  it("annulation possible pendant 10 s (plus une marge réseau)", () => {
    expect(canUndoArchive(at, at, t + 1_000)).toBe(true);
    expect(canUndoArchive(at, at, t + UNDO_WINDOW_MS)).toBe(true);
    expect(canUndoArchive(at, at, t + UNDO_WINDOW_MS + UNDO_GRACE_MS)).toBe(true);
  });
  it("même instant écrit autrement (la base renvoie +00:00) : accepté", () => {
    expect(canUndoArchive("2026-11-02T10:00:00+00:00", at, t + 1_000)).toBe(true);
    expect(canUndoArchive("2026-11-02T10:00:00.000000+00:00", at, t + 1_000)).toBe(true);
  });
  it("refusée après le délai", () => {
    expect(canUndoArchive(at, at, t + UNDO_WINDOW_MS + UNDO_GRACE_MS + 1)).toBe(false);
  });
  it("refusée si le module n'est plus rangé, ou rangé par un autre rangement", () => {
    expect(canUndoArchive(null, at, t + 1_000)).toBe(false);
    expect(canUndoArchive("2026-11-02T10:05:00.000Z", at, t + 1_000)).toBe(false);
  });
  it("jeton illisible : refusée", () => {
    expect(canUndoArchive("n'importe quoi", "n'importe quoi", t)).toBe(false);
  });
  it("l'état restauré est « pas rangé »", () => {
    expect(RESTORED_ARCHIVED_AT).toBeNull();
  });
});

describe("filtre En cours / Rangés (splitModules)", () => {
  const mods = [
    { id: "a", archived_at: null },
    { id: "b", archived_at: "2026-10-01T00:00:00Z" },
    { id: "c", archived_at: "2026-11-01T00:00:00Z" },
  ];
  it("sépare, rangés les plus récents d'abord ; un module annulé revient en cours", () => {
    const { active, archived } = splitModules(mods);
    expect(active.map((m) => m.id)).toEqual(["a"]);
    expect(archived.map((m) => m.id)).toEqual(["c", "b"]);
    const restored = splitModules(
      mods.map((m) => (m.id === "c" ? { ...m, archived_at: RESTORED_ARCHIVED_AT } : m)),
    );
    expect(restored.active.map((m) => m.id)).toEqual(["a", "c"]);
  });
});

describe("cleanRetrospective / archivedMessage", () => {
  it("nettoie, vide → null, limite", () => {
    expect(cleanRetrospective("  Commencer le projet plus tôt.\r\n")).toEqual({
      note: "Commencer le projet plus tôt.",
    });
    expect(cleanRetrospective("   ")).toEqual({ note: null });
    expect(cleanRetrospective(null)).toEqual({ note: null });
    expect(cleanRetrospective("x".repeat(NOTE_MAX + 1))).toEqual({
      error: `${NOTE_MAX} caractères maximum.`,
    });
  });
  it("message", () => {
    expect(archivedMessage("Agile")).toBe("« Agile » est rangé.");
  });
});
