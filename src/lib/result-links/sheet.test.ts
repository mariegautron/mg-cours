import { describe, expect, it } from "vitest";

import { generateToken, hashToken, isWellFormedToken } from "@/lib/quiz/token";
import type { ResultSheet } from "@/lib/assessments/results";

import { allLinksText, parsePublicSheet, publicSheetFor, resultUrl, viewStatus } from "./sheet";

const base = {
  title: "Jalon 1",
  isGroupGrade: true,
  subject: null,
  theme: "AssurLibre",
  moduleName: "Agile",
  date: null,
  value: 16,
  maxScore: 20,
  valueOn20: 16,
  criteria: [],
  axes: [],
  overflow: null,
  attendance: "present",
  personalNote: null,
  strengths: "Clair",
  progress: null,
  feedback: null,
  comments: [],
} as unknown as Omit<ResultSheet, "recipients">;

const sheet: ResultSheet = {
  ...base,
  recipients: [
    { id: "s1", name: "Lea Test", firstName: "Lea", email: "lea@x.fr" },
    { id: "s2", name: "Noa Autre", firstName: "Noa", email: "noa@x.fr" },
    { id: "s3", name: "Ali Dernier", firstName: "Ali", email: null },
  ],
};

describe("publicSheetFor — rien des autres", () => {
  it("un seul destinataire, sans e-mail", () => {
    const pub = publicSheetFor(sheet, "s2")!;
    expect(pub.recipients).toEqual([{ name: "Noa Autre", firstName: "Noa", email: null }]);
  });
  it("aucun nom ni adresse des autres membres dans l'instantané sérialisé", () => {
    const json = JSON.stringify(publicSheetFor(sheet, "s1"));
    for (const secret of ["Noa", "Ali", "noa@x.fr", "lea@x.fr", "Dernier", "Autre"]) {
      expect(json).not.toContain(secret);
    }
    expect(json).toContain("Lea Test");
  });
  it("personne inconnue de la fiche : null", () => {
    expect(publicSheetFor(sheet, "zzz")).toBeNull();
  });
  it("ne modifie pas la fiche d'origine", () => {
    publicSheetFor(sheet, "s1");
    expect(sheet.recipients).toHaveLength(3);
  });
});

describe("parsePublicSheet", () => {
  it("accepte un instantané bien formé à un destinataire", () => {
    expect(parsePublicSheet(publicSheetFor(sheet, "s1"))).not.toBeNull();
  });
  it("refuse une forme douteuse ou plusieurs destinataires", () => {
    expect(parsePublicSheet(null)).toBeNull();
    expect(parsePublicSheet([])).toBeNull();
    expect(parsePublicSheet({ title: "x" })).toBeNull();
    expect(parsePublicSheet(sheet)).toBeNull();
  });
});

describe("jeton", () => {
  it("256 bits, bien formé, haché stable, jamais le jeton lui-même", () => {
    const t = generateToken();
    expect(isWellFormedToken(t)).toBe(true);
    expect(generateToken()).not.toBe(t);
    const h = hashToken(t);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(hashToken(t));
    expect(h).not.toContain(t);
    expect(isWellFormedToken("trop-court")).toBe(false);
    expect(isWellFormedToken(`${t}!`)).toBe(false);
  });
});

describe("viewStatus / liens", () => {
  it("pas encore consulté", () => {
    expect(viewStatus({ first_viewed_at: null, view_count: 0 })).toBe("Pas encore consulté");
    expect(viewStatus({ first_viewed_at: "2026-11-02T08:15:00Z", view_count: 0 })).toBe(
      "Pas encore consulté",
    );
  });
  it("consulté : date, heure de Paris, nombre de vues", () => {
    expect(viewStatus({ first_viewed_at: "2026-11-02T08:15:00Z", view_count: 1 })).toBe(
      "Consulté le 02/11 à 09:15 (1 vue)",
    );
    expect(viewStatus({ first_viewed_at: "2026-11-02T08:15:00Z", view_count: 3 })).toContain(
      "3 vues",
    );
  });
  it("adresse du lien et « Tout copier »", () => {
    expect(resultUrl("https://app.fr/", "abc")).toBe("https://app.fr/resultats/abc");
    expect(
      allLinksText([
        { name: "DUPONT Ana", url: "u1" },
        { name: "MARTIN Zoé", url: "u2" },
      ]),
    ).toBe("DUPONT Ana : u1\nMARTIN Zoé : u2");
  });
});
