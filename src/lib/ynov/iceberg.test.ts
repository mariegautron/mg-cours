import { describe, expect, it } from "vitest";

import { ICEBERG_STATES, isAtLeast, isOutlineSent, nextState } from "./iceberg";

describe("iceberg workflow", () => {
  it("contient les 13 étapes dans l'ordre du schéma", () => {
    expect(ICEBERG_STATES).toHaveLength(13);
    expect(ICEBERG_STATES[0]).toBe("fiche_received");
    expect(ICEBERG_STATES.at(-1)).toBe("paid");
  });

  it("isAtLeast compare la position dans le workflow", () => {
    expect(isAtLeast("outline_sent", "module_created")).toBe(true);
    expect(isAtLeast("module_created", "outline_sent")).toBe(false);
    expect(isAtLeast("paid", "paid")).toBe(true);
  });

  it("isOutlineSent vrai dès outline_sent et au-delà", () => {
    expect(isOutlineSent("outline_sent")).toBe(true);
    expect(isOutlineSent("invoice_sent")).toBe(true);
    expect(isOutlineSent("outline_generated")).toBe(false);
  });

  it("nextState avance d'une étape, null en bout de chaîne", () => {
    expect(nextState("fiche_received")).toBe("module_created");
    expect(nextState("paid")).toBeNull();
  });
});
