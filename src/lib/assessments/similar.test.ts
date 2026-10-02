import { describe, expect, it } from "vitest";

import {
  adoptComment,
  parsePoints,
  similarAtSameLevel,
  similarLabel,
  type OtherCopy,
} from "./similar";

const copy = (id: string, title: string, c1: number | null, comment?: string): OtherCopy => ({
  id,
  title,
  scores: c1 === null ? {} : { c1 },
  comments: comment ? { c1: comment } : {},
});

describe("parsePoints", () => {
  it("lit les saisies, virgule comprise", () => {
    expect(parsePoints("4")).toBe(4);
    expect(parsePoints("3,5")).toBe(3.5);
    expect(parsePoints("")).toBeNull();
    expect(parsePoints(null)).toBeNull();
    expect(parsePoints("abc")).toBeNull();
  });
});

describe("similarAtSameLevel", () => {
  const others = [
    copy("g2", "Groupe 2", 4, "Choix non justifiés."),
    copy("g3", "Groupe 3", 6, "Très bien."),
    copy("g4", "Groupe 4", 4),
    copy("g5", "Groupe 5", null),
    copy("g6", "Groupe 6", 4, "Méthode présente."),
  ];
  it("même palier seulement, commentaires d'abord, puis titre", () => {
    const r = similarAtSameLevel({ criterionId: "c1", points: 4, others });
    expect(r.map((e) => e.copyId)).toEqual(["g2", "g6", "g4"]);
    expect(r[2].comment).toBeNull();
  });
  it("sans palier choisi : rien", () => {
    expect(similarAtSameLevel({ criterionId: "c1", points: null, others })).toEqual([]);
  });
  it("exclut la copie courante et respecte la limite", () => {
    expect(
      similarAtSameLevel({ criterionId: "c1", points: 4, others, currentId: "g2" }).map(
        (e) => e.copyId,
      ),
    ).toEqual(["g6", "g4"]);
    expect(similarAtSameLevel({ criterionId: "c1", points: 4, others, limit: 1 })).toHaveLength(1);
  });
  it("ignore un autre critère, une saisie absente ou non numérique", () => {
    expect(similarAtSameLevel({ criterionId: "c9", points: 4, others })).toEqual([]);
    const odd: OtherCopy[] = [
      { id: "x", title: "X", scores: { c1: "4" }, comments: null },
      { id: "y", title: "Y", scores: null, comments: undefined },
    ];
    expect(similarAtSameLevel({ criterionId: "c1", points: 4, others: odd })).toEqual([]);
  });
  it("compare les demi-points sans erreur d'arrondi", () => {
    const halves = [copy("a", "A", 0.1 + 0.2, "ok")];
    expect(similarAtSameLevel({ criterionId: "c1", points: 0.3, others: halves })).toHaveLength(1);
  });
});

describe("similarLabel / adoptComment", () => {
  const entry = { copyId: "g2", title: "Groupe 2", points: 4, comment: "Choix non justifiés." };
  it("libellé", () => {
    expect(similarLabel(entry)).toBe("Groupe 2 · 4 pts · « Choix non justifiés. »");
    expect(similarLabel({ ...entry, points: 1, comment: null })).toBe(
      "Groupe 2 · 1 pt · sans commentaire",
    );
  });
  it("reprend le commentaire sans écraser ce qui est écrit", () => {
    expect(adoptComment("", entry)).toEqual({ comment: "Choix non justifiés.", changed: true });
    expect(adoptComment("Déjà écrit.", entry)).toEqual({
      comment: "Déjà écrit.\nChoix non justifiés.",
      changed: true,
    });
  });
  it("rien à reprendre : sans commentaire en face, ou déjà présent", () => {
    expect(adoptComment("Texte", { ...entry, comment: null })).toEqual({
      comment: "Texte",
      changed: false,
    });
    expect(adoptComment("Avant. Choix non justifiés.", entry).changed).toBe(false);
  });
});
