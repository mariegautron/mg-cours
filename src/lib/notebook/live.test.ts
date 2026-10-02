import { describe, expect, it } from "vitest";

import {
  clampActive,
  findStudents,
  formatObservation,
  moveActive,
  observationAddedMessage,
  tagForKey,
} from "./live";

const s = (id: string, first_name: string, last_name: string) => ({ id, first_name, last_name });
const students = [
  s("1", "Camille", "Roux"),
  s("2", "Camélia", "Blanc"),
  s("3", "Noa", "Camus"),
  s("4", "Éloïse", "Dupont"),
];

describe("findStudents", () => {
  it("insensible aux accents et à la casse, sur prénom ou nom", () => {
    expect(findStudents(students, "ELOISE").map((x) => x.id)).toEqual(["4"]);
    expect(findStudents(students, "camel").map((x) => x.id)).toEqual(["2"]);
  });
  it("les noms qui commencent par la saisie passent avant les autres, puis ordre alphabétique", () => {
    // « cam » : Camélia Blanc, Noa Camus (nom), Camille Roux ; tous commencent par « cam ».
    expect(findStudents(students, "cam").map((x) => x.id)).toEqual(["2", "3", "1"]);
    // « ami » : seulement une sous-chaîne (Camille).
    expect(findStudents(students, "ami").map((x) => x.id)).toEqual(["1"]);
  });
  it("plusieurs mots : tous doivent correspondre, dans n'importe quel ordre", () => {
    expect(findStudents(students, "roux camille").map((x) => x.id)).toEqual(["1"]);
    expect(findStudents(students, "camille blanc")).toEqual([]);
  });
  it("saisie vide : tout le monde, trié", () => {
    expect(findStudents(students, "").map((x) => x.id)).toEqual(["2", "3", "4", "1"]);
  });
});

describe("navigation au clavier", () => {
  it("flèches en boucle, début et fin", () => {
    expect(moveActive(0, "ArrowDown", 3)).toBe(1);
    expect(moveActive(2, "ArrowDown", 3)).toBe(0);
    expect(moveActive(0, "ArrowUp", 3)).toBe(2);
    expect(moveActive(1, "Home", 3)).toBe(0);
    expect(moveActive(1, "End", 3)).toBe(2);
  });
  it("ignore les autres touches et les listes vides", () => {
    expect(moveActive(0, "a", 3)).toBeNull();
    expect(moveActive(0, "ArrowDown", 0)).toBeNull();
  });
  it("clampActive garde l'index dans la liste", () => {
    expect(clampActive(5, 3)).toBe(2);
    expect(clampActive(-1, 3)).toBe(0);
    expect(clampActive(0, 0)).toBe(-1);
  });
});

describe("étiquettes et observation datée", () => {
  it("1 à 5 choisissent l'étiquette dans l'ordre affiché", () => {
    expect(tagForKey("1")).toBe("relevant_question");
    expect(tagForKey("3")).toBe("difficulty");
    expect(tagForKey("5")).toBe("other");
    expect(tagForKey("6")).toBeNull();
    expect(tagForKey("a")).toBeNull();
  });
  it("message de confirmation", () => {
    expect(observationAddedMessage("Camille Roux", "participation")).toBe(
      "Observation ajoutée pour Camille Roux — Participation.",
    );
  });
  it("formate une observation datée, avec ou sans note", () => {
    expect(
      formatObservation({
        createdAt: "2026-10-12T08:30:00Z",
        tag: "participation",
        note: " A relancé le débat. ",
      }),
    ).toBe("12/10 · Participation « A relancé le débat. »");
    expect(
      formatObservation({ createdAt: "2026-10-12T08:30:00Z", tag: "difficulty", note: null }),
    ).toBe("12/10 · Difficulté");
  });
});
