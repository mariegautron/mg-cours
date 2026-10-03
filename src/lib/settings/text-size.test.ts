import { describe, expect, it } from "vitest";

import { readTextSize } from "./text-size";

describe("readTextSize", () => {
  it("accepte les trois tailles", () => {
    expect(readTextSize("large")).toBe("large");
    expect(readTextSize("xlarge")).toBe("xlarge");
    expect(readTextSize("normal")).toBe("normal");
  });
  it("retombe sur normal pour une valeur inconnue ou absente", () => {
    expect(readTextSize("huge")).toBe("normal");
    expect(readTextSize(undefined)).toBe("normal");
    expect(readTextSize(null)).toBe("normal");
  });
});
