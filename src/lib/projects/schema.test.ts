import { describe, expect, it } from "vitest";

import { readProjectForm, readSkeletonJson, readThemesJson } from "./schema";

function form(values: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

describe("readProjectForm", () => {
  it("exige un titre", () => {
    expect(readProjectForm(form({ title: "  " })).success).toBe(false);
  });

  it("accepte un brief et un contexte vides", () => {
    const r = readProjectForm(form({ title: "Refonte du site" }));
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.briefMd).toBe("");
  });
});

describe("readSkeletonJson", () => {
  it("lit un squelette valide", () => {
    const r = readSkeletonJson(
      JSON.stringify([
        { role: "milestone", title: "Jalon 1", isGroupGrade: true, date: "2026-11-03" },
      ]),
    );
    expect(r).toMatchObject({ success: true });
  });

  it("date vide → null", () => {
    const r = readSkeletonJson(
      JSON.stringify([{ role: "oral", title: "Oral", isGroupGrade: true, date: "" }]),
    );
    expect(r.success && r.items[0].date).toBeNull();
  });

  it("refuse un titre vide, un rôle inconnu, une liste vide et du JSON cassé", () => {
    expect(
      readSkeletonJson(JSON.stringify([{ role: "oral", title: " ", isGroupGrade: true }])).success,
    ).toBe(false);
    expect(
      readSkeletonJson(JSON.stringify([{ role: "x", title: "a", isGroupGrade: true }])).success,
    ).toBe(false);
    expect(readSkeletonJson("[]").success).toBe(false);
    expect(readSkeletonJson("{").success).toBe(false);
  });
});

describe("readThemesJson", () => {
  it("lit des thèmes, id optionnel", () => {
    const r = readThemesJson(
      JSON.stringify([
        { title: "AssurLibre" },
        { id: null, title: "JustiFacile", descriptionMd: "x" },
      ]),
    );
    expect(r.success && r.themes).toHaveLength(2);
  });

  it("accepte aucun thème (les retirer tous)", () => {
    expect(readThemesJson("[]").success).toBe(true);
  });

  it("refuse un titre vide, plus de 12 thèmes, un JSON cassé", () => {
    expect(readThemesJson(JSON.stringify([{ title: " " }])).success).toBe(false);
    expect(
      readThemesJson(JSON.stringify(Array.from({ length: 13 }, (_, i) => ({ title: `T${i}` }))))
        .success,
    ).toBe(false);
    expect(readThemesJson("nope").success).toBe(false);
  });
});
