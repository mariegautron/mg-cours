import { describe, expect, it } from "vitest";

import {
  filterPickerResources,
  NO_PICKER_FILTERS,
  normalizeSearch,
  pickerCategories,
  type PickerResource,
} from "./picker";

const list: PickerResource[] = [
  { id: "1", title: "Éthique du numérique", kind: "course", category: "Numérique responsable" },
  { id: "2", title: "TP RGAA — audit", kind: "workshop", category: "Accessibilité" },
  { id: "3", title: "Corrigé RGAA", kind: "answer_key", category: "Accessibilité" },
  { id: "4", title: "Notes en vrac", kind: null, category: null },
];
const ids = (rs: PickerResource[]) => rs.map((r) => r.id);

describe("normalizeSearch", () => {
  it("ignore casse, accents et espaces multiples", () => {
    expect(normalizeSearch("  Éthique   WEB ")).toBe("ethique web");
  });
});

describe("filterPickerResources", () => {
  const none = new Set<string>();

  it("sans filtre, garde tout", () => {
    expect(ids(filterPickerResources(list, NO_PICKER_FILTERS, none))).toEqual(["1", "2", "3", "4"]);
  });

  it("cherche dans le titre sans tenir compte des accents", () => {
    expect(ids(filterPickerResources(list, { ...NO_PICKER_FILTERS, q: "ethique" }, none))).toEqual([
      "1",
    ]);
    expect(ids(filterPickerResources(list, { ...NO_PICKER_FILTERS, q: "rgaa" }, none))).toEqual([
      "2",
      "3",
    ]);
  });

  it("filtre par type, y compris « non classées »", () => {
    expect(
      ids(filterPickerResources(list, { ...NO_PICKER_FILTERS, kind: "workshop" }, none)),
    ).toEqual(["2"]);
    expect(ids(filterPickerResources(list, { ...NO_PICKER_FILTERS, kind: "none" }, none))).toEqual([
      "4",
    ]);
  });

  it("filtre par matière", () => {
    expect(
      ids(filterPickerResources(list, { ...NO_PICKER_FILTERS, category: "Accessibilité" }, none)),
    ).toEqual(["2", "3"]);
  });

  it("ne garde que les retenues du module quand on le demande", () => {
    const retained = new Set(["3", "4"]);
    expect(
      ids(filterPickerResources(list, { ...NO_PICKER_FILTERS, retainedOnly: true }, retained)),
    ).toEqual(["3", "4"]);
  });

  it("combine les filtres", () => {
    const f = {
      ...NO_PICKER_FILTERS,
      q: "rgaa",
      category: "Accessibilité",
      kind: "answer_key" as const,
    };
    expect(ids(filterPickerResources(list, f, none))).toEqual(["3"]);
  });
});

describe("pickerCategories", () => {
  it("liste les matières distinctes, triées", () => {
    expect(pickerCategories(list)).toEqual(["Accessibilité", "Numérique responsable"]);
  });
});
