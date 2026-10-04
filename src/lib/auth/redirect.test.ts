import { describe, expect, it } from "vitest";

import { passwordProblem, safeNext } from "./redirect";

describe("safeNext", () => {
  it("garde un chemin de l'appli", () => {
    expect(safeNext("/modules/abc?x=1")).toBe("/modules/abc?x=1");
  });
  it("refuse tout ce qui sort de l'appli", () => {
    expect(safeNext("https://evil.example")).toBe("/dashboard");
    expect(safeNext("//evil.example")).toBe("/dashboard");
    expect(safeNext("/\\evil")).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
    expect(safeNext("")).toBe("/dashboard");
  });
});

describe("passwordProblem", () => {
  it("exige 8 caractères et deux saisies identiques", () => {
    expect(passwordProblem("court", "court")).toContain("au moins 8");
    expect(passwordProblem("longlonglong", "autrechose")).toContain("pas identiques");
    expect(passwordProblem("longlonglong", "longlonglong")).toBeNull();
  });
});
