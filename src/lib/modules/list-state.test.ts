import { describe, expect, it } from "vitest";

import {
  filterCounts,
  inFilter,
  metaLine,
  moduleListState,
  parseListFilter,
  schoolYearOf,
  statePill,
} from "./list-state";

const m = (over: Partial<Parameters<typeof moduleListState>[0]> = {}) => ({
  archived_at: null,
  finished_at: null,
  courses: { done: 0, total: 6 },
  ...over,
});

describe("moduleListState", () => {
  it("rangé > terminé > cours faits > en cours > à préparer", () => {
    expect(moduleListState(m({ archived_at: "2026-01-01", finished_at: "2026-01-01" }))).toBe(
      "archived",
    );
    expect(moduleListState(m({ finished_at: "2026-01-01" }))).toBe("finished");
    expect(moduleListState(m({ courses: { done: 6, total: 6 } }))).toBe("taught");
    expect(moduleListState(m({ courses: { done: 4, total: 6 } }))).toBe("running");
    expect(moduleListState(m())).toBe("to_prepare");
  });
  it("sans séance : à préparer ; colonne absente : jamais terminé", () => {
    expect(moduleListState({ archived_at: null, courses: { done: 0, total: 0 } })).toBe(
      "to_prepare",
    );
  });
});

describe("filtres", () => {
  it("« cours faits » reste dans En cours", () => {
    expect(inFilter("taught", "running")).toBe(true);
    expect(inFilter("running", "running")).toBe(true);
    expect(inFilter("to_prepare", "running")).toBe(false);
    expect(inFilter("finished", "finished")).toBe(true);
  });
  it("effectifs", () => {
    expect(
      filterCounts(["running", "taught", "to_prepare", "finished", "finished", "archived"]),
    ).toEqual({
      running: 2,
      to_prepare: 1,
      finished: 2,
      archived: 1,
    });
  });
  it("lecture de l'URL", () => {
    expect(parseListFilter("finished")).toBe("finished");
    expect(parseListFilter("x")).toBe("running");
    expect(parseListFilter(undefined)).toBe("running");
  });
  it("année scolaire", () => {
    expect(schoolYearOf(2026)).toBe("2026-2027");
  });
});

describe("pastilles et meta", () => {
  it("libellés", () => {
    expect(statePill("running", { done: 4, total: 6 })).toEqual({
      label: "Séance 4 sur 6",
      tone: "wip",
    });
    expect(statePill("to_prepare", { done: 0, total: 0 }).label).toBe("À préparer");
    expect(statePill("taught", { done: 6, total: 6 }).label).toBe("Cours faits");
    expect(statePill("finished", { done: 6, total: 6 }).label).toBe("Terminé");
  });
  it("ligne de méta, date de début seulement si à préparer", () => {
    const base = {
      ycode: "A2627_4801",
      schoolName: "YNOV Nantes",
      level: null,
      totalHours: 14,
      firstSessionDate: "2026-11-09",
    };
    expect(metaLine({ ...base, state: "to_prepare" })).toBe(
      "A2627_4801 · YNOV Nantes · 14 h · à partir du 09/11",
    );
    expect(metaLine({ ...base, state: "running", schoolName: null, ycode: null })).toBe(
      "École non renseignée · 14 h",
    );
  });
});
