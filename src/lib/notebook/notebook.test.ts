import { describe, expect, it } from "vitest";

import {
  COMPLETION_LABELS,
  notebookStudents,
  OBSERVATION_TAG_LABELS,
  readClosureForm,
  readObservationForm,
} from "./notebook";

const st = (id: string, first_name: string, last_name: string) => ({ id, first_name, last_name });
const form = (entries: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
};
const UUID = "3f1c2b0e-8a4d-4c6e-9f10-2b3c4d5e6f70";

describe("notebookStudents", () => {
  const groups = [
    { members: [st("1", "Élodie", "Martin"), st("2", "Hugo", "Bernard")] },
    { members: [st("1", "Élodie", "Martin"), st("3", "Inès", "Faure")] },
  ];

  it("dédoublonne et trie par nom puis prénom", () => {
    expect(notebookStudents(groups).map((s) => s.id)).toEqual(["2", "3", "1"]);
  });

  it("filtre par prénom ou nom, sans tenir compte des accents ni de la casse", () => {
    expect(notebookStudents(groups, "elo").map((s) => s.id)).toEqual(["1"]);
    expect(notebookStudents(groups, "INES fau").map((s) => s.id)).toEqual(["3"]);
    expect(notebookStudents(groups, "zzz")).toEqual([]);
  });
});

describe("readObservationForm", () => {
  it("accepte une étiquette seule, la note vide devient null", () => {
    const r = readObservationForm(form({ studentId: UUID, tag: "participation", note: "  " }));
    expect(r.success && r.data).toEqual({ studentId: UUID, tag: "participation", note: null });
  });

  it("refuse une étiquette inconnue ou un·e étudiant·e invalide", () => {
    expect(readObservationForm(form({ studentId: UUID, tag: "bravo" })).success).toBe(false);
    expect(readObservationForm(form({ studentId: "x", tag: "other" })).success).toBe(false);
  });
});

describe("readClosureForm", () => {
  it("lit le statut et les textes, vides → null", () => {
    const r = readClosureForm(
      form({ completion: "partial", notCovered: "Partie 3", nextTime: "", retroNote: " RAS " }),
    );
    expect(r.success && r.data).toEqual({
      completion: "partial",
      notCovered: "Partie 3",
      nextTime: null,
      retroNote: "RAS",
    });
  });

  it("statut facultatif, mais jamais une valeur inconnue", () => {
    expect(readClosureForm(form({})).success).toBe(true);
    expect(readClosureForm(form({ completion: "finished" })).success).toBe(false);
  });
});

it("libellés français pour chaque étiquette et chaque statut", () => {
  expect(Object.values(OBSERVATION_TAG_LABELS)).toEqual([
    "Question pertinente",
    "Participation",
    "Difficulté",
    "Absent·e ou retard",
    "Autre",
  ]);
  expect(COMPLETION_LABELS.partial).toBe("Partiellement faite");
});
