import { describe, expect, it } from "vitest";

import {
  appreciationStatus,
  cleanAppreciation,
  counterLabel,
  countText,
  exportAll,
  exportCsv,
  exportLine,
  truncateAppreciation,
  validateLength,
} from "./appreciation";

describe("countText", () => {
  it("caractères, sans espaces, lignes", () => {
    expect(countText("")).toEqual({ chars: 0, charsWithoutSpaces: 0, lines: 0 });
    expect(countText("Bien joué")).toEqual({ chars: 9, charsWithoutSpaces: 8, lines: 1 });
    expect(countText("a\nb\r\nc")).toEqual({ chars: 5, charsWithoutSpaces: 3, lines: 3 });
  });
  it("compte les accents comme un caractère", () => {
    expect(countText("été").chars).toBe(3);
  });
});

describe("statut et validation", () => {
  it("à écrire, écrite, trop longue", () => {
    expect(appreciationStatus("  ", 250)).toBe("todo");
    expect(appreciationStatus("Très bien.", 250)).toBe("written");
    expect(appreciationStatus("x".repeat(251), 250)).toBe("too_long");
    expect(appreciationStatus("x".repeat(250), 250)).toBe("written");
  });
  it("longueur : ok ou nombre de caractères en trop", () => {
    expect(validateLength("abc", 5)).toEqual({ ok: true });
    expect(validateLength("abcdefg", 5)).toEqual({
      ok: false,
      over: 2,
      message: "2 caractères en trop (maximum 5).",
    });
    expect(validateLength("abcdef", 5)).toMatchObject({
      ok: false,
      over: 1,
      message: "1 caractère en trop (maximum 5).",
    });
    // Les espaces en bout ne comptent pas (texte nettoyé avant enregistrement).
    expect(validateLength("  abcde  ", 5)).toEqual({ ok: true });
  });
  it("compteur", () => {
    expect(counterLabel("Bonjour", 250)).toBe("7 / 250 caractères");
    expect(counterLabel("x".repeat(12), 10)).toBe("2 caractères en trop (12 / 10)");
  });
});

describe("truncateAppreciation", () => {
  it("ne touche pas un texte assez court, coupe à la fin d'un mot sinon", () => {
    expect(truncateAppreciation("Court", 20)).toBe("Court");
    expect(truncateAppreciation("Un travail très sérieux et régulier", 20)).toBe("Un travail très");
  });
  it("mot unique trop long : coupe net", () => {
    expect(truncateAppreciation("abcdefghij", 5)).toBe("abcde");
  });
  it("jamais de résultat plus long que la limite", () => {
    expect(truncateAppreciation("a b c d e f g h", 7).length).toBeLessThanOrEqual(7);
  });
});

describe("cleanAppreciation", () => {
  it("retours Windows et espaces de bout", () => {
    expect(cleanAppreciation("  a\r\nb  ")).toBe("a\nb");
  });
});

describe("export", () => {
  const rows = [
    { firstName: "Zoé", lastName: "Martin", text: "Très investie.\nContinue ainsi." },
    { firstName: "Ana", lastName: "Durand", text: "Sérieuse." },
    { firstName: "Léo", lastName: "Bernard", text: "   " },
  ];
  it("une ligne « NOM Prénom : texte », sur une seule ligne", () => {
    expect(exportLine(rows[0])).toBe("MARTIN Zoé : Très investie. Continue ainsi.");
  });
  it("toutes les appréciations écrites, triées par nom ; les vides sont omises", () => {
    expect(exportAll(rows)).toBe(
      "DURAND Ana : Sérieuse.\nMARTIN Zoé : Très investie. Continue ainsi.",
    );
    expect(exportAll([])).toBe("");
  });
  it("CSV avec en-tête, séparateur « ; » et guillemets échappés", () => {
    const csv = exportCsv([
      ...rows,
      { firstName: "Éloïse", lastName: "Petit", text: 'Dit « bravo »; "ok"' },
    ]);
    expect(csv.split("\r\n")).toEqual([
      "Nom;Prénom;Appréciation",
      "DURAND;Ana;Sérieuse.",
      "MARTIN;Zoé;Très investie. Continue ainsi.",
      'PETIT;Éloïse;"Dit « bravo »; ""ok"""',
    ]);
  });
});
