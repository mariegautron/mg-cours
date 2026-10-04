import { describe, expect, it } from "vitest";

import { unnoteConfirmation, unnoteMessage, unnoteWordMatches } from "./unnote";

describe("ne plus noter une phase", () => {
  it("confirmation simple sans note, saisie du mot avec des notes", () => {
    expect(unnoteConfirmation(0)).toBe("simple");
    expect(unnoteConfirmation(3)).toBe("typed");
  });

  it("accepte « supprimer » sans tenir compte de la casse ni des espaces", () => {
    expect(unnoteWordMatches(" Supprimer ")).toBe(true);
    expect(unnoteWordMatches("supprime")).toBe(false);
    expect(unnoteWordMatches("")).toBe(false);
  });

  it("annonce ce qui sera supprimé", () => {
    expect(unnoteMessage(0)).toBe("Cette évaluation et ses notes seront supprimées.");
    expect(unnoteMessage(1)).toBe("Cette évaluation et ses 1 note seront supprimées.");
    expect(unnoteMessage(4)).toContain("4 notes");
  });
});
