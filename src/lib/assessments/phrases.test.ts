import { describe, expect, it } from "vitest";

import {
  filterPhrases,
  insertPhrase,
  matchesCriterion,
  phraseInputSchema,
  rankPhrases,
  selectedOrAll,
  type Phrase,
} from "./phrases";

const phrase = (over: Partial<Phrase>): Phrase => ({
  id: "p",
  text: "Texte",
  category: "advice",
  grid_criterion_id: null,
  criterion_label: null,
  subject: null,
  use_count: 0,
  last_used_at: null,
  created_at: "2026-09-01T00:00:00Z",
  ...over,
});

describe("rankPhrases", () => {
  it("met les plus utilisées d'abord", () => {
    const ranked = rankPhrases(
      [phrase({ id: "a", use_count: 1 }), phrase({ id: "b", use_count: 5 })],
      null,
    );
    expect(ranked.map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("à usage égal, préfère la même matière (sans tenir compte de la casse)", () => {
    const ranked = rankPhrases(
      [
        phrase({ id: "autre", use_count: 2, subject: "Agile" }),
        phrase({ id: "meme", use_count: 2, subject: "accessibilité" }),
        phrase({ id: "vide", use_count: 2 }),
      ],
      "Accessibilité",
    );
    expect(ranked[0].id).toBe("meme");
  });

  it("puis la plus récemment utilisée, puis la plus récemment créée", () => {
    const ranked = rankPhrases(
      [
        phrase({ id: "ancienne", last_used_at: "2026-09-01T00:00:00Z" }),
        phrase({ id: "recente", last_used_at: "2026-09-20T00:00:00Z" }),
        phrase({ id: "jamais-neuve", created_at: "2026-09-25T00:00:00Z" }),
      ],
      null,
    );
    expect(ranked.map((p) => p.id)).toEqual(["recente", "ancienne", "jamais-neuve"]);
  });

  it("ne modifie pas la liste d'entrée", () => {
    const input = [phrase({ id: "a" }), phrase({ id: "b", use_count: 3 })];
    rankPhrases(input, null);
    expect(input.map((p) => p.id)).toEqual(["a", "b"]);
  });
});

describe("filterPhrases / matchesCriterion", () => {
  const phrases = [
    phrase({ id: "id", grid_criterion_id: "c1", criterion_label: "Structure" }),
    phrase({ id: "label", grid_criterion_id: null, criterion_label: " structure " }),
    phrase({ id: "autre", grid_criterion_id: "c2", criterion_label: "Bouton" }),
    phrase({ id: "general" }),
  ];

  it("retrouve une phrase par identifiant de critère ou par libellé identique", () => {
    const ids = filterPhrases(phrases, { kind: "criterion", id: "c1", label: "Structure" }).map(
      (p) => p.id,
    );
    expect(ids).toEqual(["id", "label"]);
    expect(matchesCriterion(phrases[3], { id: "c1", label: "Structure" })).toBe(false);
  });

  it("« général » ne garde que les phrases sans critère ; « tous » garde tout", () => {
    expect(filterPhrases(phrases, { kind: "general" }).map((p) => p.id)).toEqual(["general"]);
    expect(filterPhrases(phrases, { kind: "all" })).toHaveLength(4);
  });
});

describe("selectedOrAll", () => {
  it("prend la sélection, dans un sens ou dans l'autre, sinon tout le commentaire", () => {
    const value = "Bon travail. Pense aux labels.";
    expect(selectedOrAll(value, 12, 30)).toBe("Pense aux labels.");
    expect(selectedOrAll(value, 30, 12)).toBe("Pense aux labels.");
    expect(selectedOrAll(value, 5, 5)).toBe("Bon travail. Pense aux labels.");
  });
});

describe("insertPhrase", () => {
  it("sans curseur ou à la fin : sur une nouvelle ligne, sans écraser", () => {
    expect(insertPhrase("", "A", null)).toEqual({ value: "A", cursor: 1 });
    expect(insertPhrase("Bien.  ", "A", null)).toEqual({ value: "Bien.\nA", cursor: 7 });
    expect(insertPhrase("Bien.", "A", 5).value).toBe("Bien.\nA");
  });

  it("au milieu : garde le texte autour et ajoute des espaces seulement si besoin", () => {
    expect(insertPhrase("AvantApres", "X", 5)).toEqual({ value: "Avant X Apres", cursor: 7 });
    expect(insertPhrase("Avant Apres", "X", 6)).toEqual({ value: "Avant X Apres", cursor: 7 });
    expect(insertPhrase("Avant. Fin", "X", 6).value).toBe("Avant. X Fin");
    expect(insertPhrase("Suite", "X", 0)).toEqual({ value: "X Suite", cursor: 1 });
  });
});

describe("phraseInputSchema", () => {
  it("valide, nettoie la matière vide et refuse un texte vide", () => {
    const ok = phraseInputSchema.parse({ text: " Bien ", criterionId: null, subject: "  " });
    expect(ok).toEqual({ text: "Bien", criterionId: null, subject: null, category: "advice" });
    expect(phraseInputSchema.safeParse({ text: " ", criterionId: null, subject: "" }).success).toBe(
      false,
    );
    expect(
      phraseInputSchema.safeParse({ text: "x", criterionId: "pas-un-uuid", subject: "" }).success,
    ).toBe(false);
  });
});
