import { describe, expect, it } from "vitest";

import {
  correctionProgress,
  formSnapshot,
  neighborId,
  observationsForCopy,
  shouldAutosave,
  type ObservationLine,
} from "./session";

describe("correctionProgress", () => {
  it("compte les copies corrigées et celles à enregistrer", () => {
    const p = correctionProgress([
      { corrected: true, dirty: false },
      { corrected: true, dirty: true },
      { corrected: false, dirty: true },
    ]);
    expect(p).toEqual({ done: 2, total: 3, label: "2/3 corrigées", dirty: 2 });
  });

  it("accorde au singulier jusqu'à une copie corrigée", () => {
    expect(correctionProgress([{ corrected: true, dirty: false }]).label).toBe("1/1 corrigée");
    expect(correctionProgress([{ corrected: false, dirty: false }]).label).toBe("0/1 corrigée");
    expect(correctionProgress([]).label).toBe("0/0 corrigée");
  });
});

describe("neighborId", () => {
  const ids = ["a", "b", "c"];

  it("renvoie la copie précédente ou suivante, null aux extrémités", () => {
    expect(neighborId(ids, "b", 1)).toBe("c");
    expect(neighborId(ids, "b", -1)).toBe("a");
    expect(neighborId(ids, "a", -1)).toBeNull();
    expect(neighborId(ids, "c", 1)).toBeNull();
    expect(neighborId(ids, "zzz", 1)).toBeNull();
  });
});

describe("shouldAutosave", () => {
  it("attend le retour du réseau", () => {
    expect(shouldAutosave({ dirty: true, pending: false, ready: true, online: false })).toBe(false);
    expect(shouldAutosave({ dirty: true, pending: false, ready: true, online: true })).toBe(true);
  });
  it("seulement si modifié, pas en cours d'enregistrement et enregistrable", () => {
    expect(shouldAutosave({ dirty: true, pending: false, ready: true })).toBe(true);
    expect(shouldAutosave({ dirty: false, pending: false, ready: true })).toBe(false);
    expect(shouldAutosave({ dirty: true, pending: true, ready: true })).toBe(false);
    expect(shouldAutosave({ dirty: true, pending: false, ready: false })).toBe(false);
  });
});

describe("formSnapshot", () => {
  it("change quand la saisie change, reste stable sinon", () => {
    expect(formSnapshot([{ a: "1" }, "x"])).toBe(formSnapshot([{ a: "1" }, "x"]));
    expect(formSnapshot([{ a: "1" }, "x"])).not.toBe(formSnapshot([{ a: "2" }, "x"]));
  });
});

describe("observationsForCopy", () => {
  const line = (over: Partial<ObservationLine>): ObservationLine => ({
    id: "o",
    studentId: "s1",
    studentName: "Lea Test",
    tag: "Participation",
    note: null,
    createdAt: "2026-10-01T10:00:00Z",
    ...over,
  });

  it("garde celles de l'étudiant·e, les plus récentes d'abord", () => {
    const result = observationsForCopy(
      ["s1"],
      [
        line({ id: "ancienne", createdAt: "2026-09-01T00:00:00Z" }),
        line({ id: "autre", studentId: "s2" }),
        line({ id: "recente", createdAt: "2026-10-05T00:00:00Z" }),
      ],
    );
    expect(result.map((o) => o.id)).toEqual(["recente", "ancienne"]);
  });

  it("note de groupe : toutes les observations des membres", () => {
    const result = observationsForCopy(
      ["s1", "s2"],
      [line({ id: "1" }), line({ id: "2", studentId: "s2", studentName: "Noa Test" })],
    );
    expect(result).toHaveLength(2);
    expect(observationsForCopy([], [line({})])).toEqual([]);
  });
});
