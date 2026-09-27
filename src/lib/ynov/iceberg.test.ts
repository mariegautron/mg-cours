import { describe, expect, it } from "vitest";

import {
  advanceTo,
  applyOutlineUpload,
  ICEBERG_STATES,
  isAtLeast,
  isOutlineSent,
  nextState,
} from "./iceberg";

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

  it("advanceTo avance sans jamais reculer", () => {
    expect(advanceTo("module_created", "outline_generated")).toBe("outline_generated");
    expect(advanceTo("invoice_sent", "outline_sent")).toBe("invoice_sent");
    expect(advanceTo("outline_sent", "outline_sent")).toBe("outline_sent");
  });
});

describe("applyOutlineUpload (trame déposée = trame envoyée)", () => {
  it("avance jusqu'à outline_sent et coche la progression pédagogique", () => {
    const next = applyOutlineUpload({
      iceberg_state: "module_created",
      admin_docs: { fiche_positionnement: true },
    });
    expect(next.iceberg_state).toBe("outline_sent");
    expect(next.admin_docs).toEqual({ fiche_positionnement: true, progression_pedagogique: true });
    expect(isOutlineSent(next.iceberg_state)).toBe(true);
  });

  it("ne fait jamais reculer un module plus avancé", () => {
    expect(applyOutlineUpload({ iceberg_state: "invoice_sent", admin_docs: {} }).iceberg_state).toBe(
      "invoice_sent",
    );
  });

  it("est idempotent", () => {
    const once = applyOutlineUpload({ iceberg_state: "fiche_received", admin_docs: {} });
    expect(applyOutlineUpload(once)).toEqual(once);
  });
});
