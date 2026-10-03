import { describe, expect, it } from "vitest";

import {
  canPrepareMakeupInAdvance,
  frameFor,
  frameWarnings,
  kindOf,
  TYPE_PRESETS,
} from "./individual";

describe("kindOf", () => {
  it("reconnaît les propositions", () => {
    expect(TYPE_PRESETS.map(kindOf)).toEqual(["delivery", "quiz", "in_class", "oral"]);
  });
  it("accents, casse et formulations libres", () => {
    expect(kindOf("Écrit sur table")).toBe("in_class");
    expect(kindOf("QUIZ de fin")).toBe("quiz");
    expect(kindOf("Dossier à rendre")).toBe("delivery");
    expect(kindOf("Dépôt GitHub")).toBe("delivery");
    expect(kindOf("oral")).toBe("oral");
  });
  it("vide ou inconnu : autre", () => {
    expect(kindOf("")).toBe("other");
    expect(kindOf(null)).toBe("other");
    expect(kindOf("Atelier pratique")).toBe("other");
  });
});

describe("frameFor", () => {
  it("libellé de la date et durée attendue selon le type", () => {
    expect(frameFor("QCM")).toMatchObject({ dateLabel: "Date de passation", needsDuration: true });
    expect(frameFor("Rendu de fichiers ou de liens")).toMatchObject({
      dateLabel: "Date de rendu",
      needsDuration: false,
    });
    expect(frameFor(null).dateLabel).toBe("Date");
  });
});

describe("frameWarnings", () => {
  it("rendu sans date", () => {
    expect(
      frameWarnings({ type: "Rendu de fichiers ou de liens", date: "", durationMinutes: "" }),
    ).toEqual(["Indique la date de rendu."]);
  });
  it("épreuve en classe : date et durée", () => {
    expect(frameWarnings({ type: "En classe (écrit)", date: null, durationMinutes: null })).toEqual(
      ["Indique la date de l'épreuve.", "Indique la durée en minutes."],
    );
    expect(
      frameWarnings({ type: "En classe (écrit)", date: "2026-11-05", durationMinutes: "45" }),
    ).toEqual([]);
    expect(frameWarnings({ type: "QCM", date: "2026-11-05", durationMinutes: 0 })).toEqual([
      "Indique la durée en minutes.",
    ]);
  });
  it("type libre : rien à signaler", () => {
    expect(frameWarnings({ type: "Atelier", date: null, durationMinutes: null })).toEqual([]);
  });
});

describe("canPrepareMakeupInAdvance", () => {
  it("individuelle et pas déjà un rattrapage", () => {
    expect(canPrepareMakeupInAdvance(false, false)).toBe(true);
    expect(canPrepareMakeupInAdvance(true, false)).toBe(false);
    expect(canPrepareMakeupInAdvance(false, true)).toBe(false);
  });
});
