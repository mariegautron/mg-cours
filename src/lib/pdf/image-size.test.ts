import { describe, expect, it } from "vitest";

import { fitImage, IMAGE_MAX_HEIGHT, IMAGE_MAX_WIDTH } from "./image-size";

describe("fitImage", () => {
  it("garde les petites images à leur taille (1 px = 0,75 pt)", () => {
    expect(fitImage(400, 200)).toEqual({ width: 300, height: 150 });
  });

  it("réduit une large image à la largeur de la page, proportions gardées", () => {
    const size = fitImage(1400, 700)!;
    expect(size.width).toBeLessThanOrEqual(IMAGE_MAX_WIDTH);
    expect(size.width / size.height).toBeCloseTo(2, 1);
  });

  it("réduit une image haute à la hauteur maximale", () => {
    const size = fitImage(600, 4000)!;
    expect(size.height).toBeLessThanOrEqual(IMAGE_MAX_HEIGHT);
    expect(size.width).toBeGreaterThanOrEqual(1);
  });

  it("dimensions absentes ou aberrantes : pas d'image plutôt qu'une mise en page impossible", () => {
    for (const [w, h] of [
      [undefined, 100],
      [100, undefined],
      [0, 0],
      [-5, 10],
      [Number.NaN, 10],
      [Infinity, 10],
    ] as const) {
      expect(fitImage(w, h)).toBeNull();
    }
  });
});
