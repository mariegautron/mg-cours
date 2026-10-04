import { describe, expect, it } from "vitest";

import { bonusLine, OPQUAST_SCALE, parseScale, scaleToPoints, validateScale } from "./score-scale";

describe("scaleToPoints (barème Opquast)", () => {
  const pts = (raw: number | string | null) => scaleToPoints(OPQUAST_SCALE, raw);
  it("bornes inclusives", () => {
    expect(pts(0)).toEqual({ status: "ok", points: 2 });
    expect(pts(99)).toEqual({ status: "ok", points: 2 });
    expect(pts(100)).toEqual({ status: "ok", points: 4 });
    expect(pts(938)).toEqual({ status: "ok", points: 19 });
    expect(pts(939)).toEqual({ status: "ok", points: 20 });
    expect(pts(1000)).toEqual({ status: "ok", points: 20 });
    expect(pts("725")).toEqual({ status: "ok", points: 12 });
  });
  it("score absent : pas de note ; zéro est un score", () => {
    expect(pts(null)).toEqual({ status: "none" });
    expect(pts("  ")).toEqual({ status: "none" });
    expect(pts(0).status).toBe("ok");
  });
  it("hors barème ou illisible : erreur claire", () => {
    const high = pts(1001);
    expect(high).toMatchObject({ status: "error" });
    expect(high.status === "error" && high.message).toContain("de 0 à 1000");
    expect(pts(-1).status).toBe("error");
    expect(pts("abc").status).toBe("error");
    expect(pts(12.5).status).toBe("error");
  });
});

describe("validateScale", () => {
  it("accepte le barème Opquast", () => {
    expect(validateScale(OPQUAST_SCALE)).toBeNull();
  });
  it("refuse chevauchement, bornes inversées, points hors 0–20, barème vide", () => {
    expect(
      validateScale([
        { min: 0, max: 100, points: 5 },
        { min: 100, max: 200, points: 6 },
      ]),
    ).toContain("chevauchent");
    expect(validateScale([{ min: 10, max: 5, points: 5 }])).toContain("dépasse");
    expect(validateScale([{ min: 0, max: 5, points: 21 }])).toContain("0 à 20");
    expect(validateScale([])).toContain("vide");
    expect(validateScale([{ min: 0.5, max: 5, points: 3 }])).toContain("entiers");
  });
});

describe("parseScale", () => {
  it("relit un jsonb valide, refuse le reste", () => {
    expect(parseScale([{ min: 0, max: 9, points: 1 }])).toEqual([{ min: 0, max: 9, points: 1 }]);
    expect(parseScale([{ min: "0" }])).toBeNull();
    expect(parseScale("x")).toBeNull();
    expect(parseScale([])).toBeNull();
  });
});

describe("bonusLine", () => {
  it("dit l'effet réel, sans jamais promettre une baisse", () => {
    expect(bonusLine(null)).toBeNull();
    expect(bonusLine(0)).toContain("sans effet");
    expect(bonusLine(1.346)).toBe("Bonus certification : +1,35 point sur la moyenne.");
    expect(bonusLine(3.6)).toBe("Bonus certification : +3,6 points sur la moyenne.");
  });
});
