import { describe, expect, it } from "vitest";

import { readCourseForm } from "./schema";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("readCourseForm — statut de préparation", () => {
  it("vaut « todo » par défaut", () => {
    const parsed = readCourseForm(form({ title: "Intro" }));
    expect(parsed.success && parsed.data.prepStatus).toBe("todo");
  });

  it("accepte in_progress / ready", () => {
    const parsed = readCourseForm(form({ title: "Intro", prepStatus: "ready" }));
    expect(parsed.success && parsed.data.prepStatus).toBe("ready");
  });

  it("refuse une valeur inconnue", () => {
    expect(readCourseForm(form({ title: "Intro", prepStatus: "done" })).success).toBe(false);
  });
});
