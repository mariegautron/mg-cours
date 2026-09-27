import { describe, expect, it } from "vitest";

import { readResourceForm } from "./schema";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("readResourceForm — type et visibilité", () => {
  it("exige un type", () => {
    const parsed = readResourceForm(form({ title: "RACI" }));
    expect(parsed.success).toBe(false);
    expect(!parsed.success && parsed.error.flatten().fieldErrors.kind).toEqual([
      "Choisissez le type de ressource.",
    ]);
  });

  it("refuse un type inconnu", () => {
    expect(readResourceForm(form({ title: "RACI", kind: "slides" })).success).toBe(false);
  });

  it("vaut « étudiant·es » par défaut", () => {
    const parsed = readResourceForm(form({ title: "RACI", kind: "course" }));
    expect(parsed.success && parsed.data.audience).toBe("students");
  });

  it("garde « enseignante » et la matière", () => {
    const parsed = readResourceForm(
      form({ title: "Corrigé", kind: "answer_key", audience: "teacher", category: "Agilité" }),
    );
    expect(parsed.success && [parsed.data.audience, parsed.data.category]).toEqual([
      "teacher",
      "Agilité",
    ]);
  });
});
