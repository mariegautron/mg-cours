import { describe, expect, it } from "vitest";

import {
  appendDatedNote,
  findJumps,
  isProjectable,
  jumpEntries,
  previewIndex,
  searchLibrary,
  sectionStarts,
  SESSION_NOTES_MAX,
  type LibraryResource,
} from "./presenter";

describe("sectionStarts", () => {
  it("première diapo de chaque section, -1 sans diapo", () => {
    expect(sectionStarts([0, 0, 1, 1, 1, 3], 4)).toEqual([0, 2, -1, 5]);
    expect(sectionStarts([], 2)).toEqual([-1, -1]);
  });
});

describe("findJumps", () => {
  const sections = ["Ouverture", "Cours : Backlog", "Sujet", "Clôture"];
  const slides = [
    { label: "Ouverture" },
    { label: "Objectifs de la séance" },
    { label: "Backlog" },
    { label: null },
    { label: "Prioriser : valeur et effort" },
  ];
  const entries = jumpEntries(sections, [0, 2, -1, 4], slides);

  it("ignore les sections sans diapo, garde les diapos titrées", () => {
    expect(entries.filter((e) => e.kind === "section").map((e) => e.label)).toEqual([
      "Ouverture",
      "Cours : Backlog",
      "Clôture",
    ]);
  });
  it("un numéro mène à la diapositive, dans les bornes", () => {
    expect(findJumps("3", entries, 5)).toEqual([
      { kind: "slide", label: "Diapositive 3", index: 2 },
    ]);
    expect(findJumps("9", entries, 5)).toEqual([]);
    expect(findJumps("0", entries, 5)).toEqual([]);
  });
  it("cherche dans les titres sans accent ni casse, préfixe d'abord, sections avant diapos", () => {
    const r = findJumps("CLOTURE", entries, 5);
    expect(r[0].label).toBe("Clôture");
    const back = findJumps("backlog", entries, 5);
    // « Backlog » (diapo, préfixe) et la section « Cours : Backlog » mènent à la même diapo : une seule entrée.
    expect(back.map((e) => e.label)).toEqual(["Backlog"]);
    const effort = findJumps("effort", entries, 5);
    expect(effort.map((e) => e.index)).toEqual([4]);
  });
  it("une section et sa diapo d'ouverture ne sont listées qu'une fois", () => {
    expect(findJumps("ouverture", entries, 5)).toHaveLength(1);
  });
  it("requête vide ou sans résultat", () => {
    expect(findJumps("", entries, 5)).toEqual([]);
    expect(findJumps("zzz", entries, 5)).toEqual([]);
  });
});

describe("searchLibrary", () => {
  const lib: LibraryResource[] = [
    {
      id: "1",
      title: "Estimation en points",
      kindLabel: "Cours",
      audience: "students",
      status: "ready",
    },
    {
      id: "2",
      title: "Atelier : estimer un sprint",
      kindLabel: "Atelier",
      audience: "students",
      status: "progress",
    },
    { id: "3", title: "Corrigé estimation", kindLabel: null, audience: "teacher", status: "ready" },
    { id: "4", title: "Autre sujet", kindLabel: null, audience: "students", status: "ready" },
  ];
  it("minimum 2 caractères", () => {
    expect(searchLibrary("e", lib)).toEqual([]);
  });
  it("préfixe avant sous-chaîne, puis alphabétique, avec le drapeau « projetable »", () => {
    const r = searchLibrary("estim", lib);
    expect(r.map((x) => x.id)).toEqual(["1", "2", "3"]);
    // « Estimation… » commence par la requête ; « Atelier : estimer… » et « Corrigé estimation » la contiennent.
    expect(r.map((x) => x.projectable)).toEqual([true, false, false]);
  });
  it("jamais projetable : réservé à l'enseignante ou pas prêt", () => {
    expect(isProjectable({ audience: "teacher", status: "ready" })).toBe(false);
    expect(isProjectable({ audience: "students", status: "progress" })).toBe(false);
    expect(isProjectable({ audience: "students", status: "ready" })).toBe(true);
  });
});

describe("previewIndex", () => {
  it("l'aperçu privé prime sur la diapo projetée sans la modifier", () => {
    expect(previewIndex(4, null)).toBe(4);
    expect(previewIndex(4, 9)).toBe(9);
    expect(previewIndex(4, 0)).toBe(0);
  });
});

describe("appendDatedNote", () => {
  const now = new Date("2026-11-04T09:15:00Z");
  it("ajoute une ligne datée à la suite", () => {
    expect(appendDatedNote(null, "Insister sur la valeur", now)).toBe(
      "[04/11 10:15] Insister sur la valeur",
    );
    expect(appendDatedNote("[03/11 08:00] avant\n", "après  deux", now)).toBe(
      "[03/11 08:00] avant\n[04/11 10:15] après deux",
    );
  });
  it("refuse une note vide ou qui ferait dépasser la limite", () => {
    expect(appendDatedNote("x", "   ", now)).toBeNull();
    expect(appendDatedNote("a".repeat(SESSION_NOTES_MAX), "note", now)).toBeNull();
  });
});
