import { describe, expect, it } from "vitest";

import { plural } from "@/lib/plural";

describe("plural", () => {
  it("accorde au singulier jusqu'à 1 (0 compris, comme en français)", () => {
    expect(plural(0, "objectif")).toBe("0 objectif");
    expect(plural(1, "objectif")).toBe("1 objectif");
    expect(plural(2, "objectif")).toBe("2 objectifs");
  });

  it("accepte un pluriel irrégulier ou inclusif", () => {
    expect(plural(1, "étudiant·e")).toBe("1 étudiant·e");
    expect(plural(3, "étudiant·e", "étudiant·es")).toBe("3 étudiant·es");
    expect(plural(2, "travail", "travaux")).toBe("2 travaux");
  });
});
