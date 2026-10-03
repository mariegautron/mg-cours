import { describe, expect, it } from "vitest";

import {
  canRelease,
  classUrl,
  filterNames,
  parseClassNames,
  readClaimStatus,
} from "./class-access";

describe("class-access", () => {
  it("url de classe sans double barre", () => {
    expect(classUrl("https://x.fr/", "T")).toBe("https://x.fr/q/classe/T");
  });
  it("parse les noms, ignore l'invalide", () => {
    expect(
      parseClassNames([{ id: "a", name: " Ana Roy " }, { id: 3 }, null, { id: "b", name: "" }]),
    ).toEqual([{ id: "a", name: "Ana Roy" }]);
    expect(parseClassNames("x")).toEqual([]);
  });
  it("filtre sans accents ni casse", () => {
    const names = [
      { id: "1", name: "Éloïse Dupont" },
      { id: "2", name: "Bob Martin" },
    ];
    expect(filterNames(names, "eloise").map((n) => n.id)).toEqual(["1"]);
    expect(filterNames(names, "MART").map((n) => n.id)).toEqual(["2"]);
    expect(filterNames(names, "  ")).toHaveLength(2);
  });
  it("statuts de prise de nom", () => {
    expect(readClaimStatus({ status: "ok" })).toBe("ok");
    expect(readClaimStatus({ status: "taken" })).toBe("taken");
    expect(readClaimStatus({ status: "hack" })).toBe("unavailable");
    expect(readClaimStatus(null)).toBe("unavailable");
  });
  it("libération seulement avant le début", () => {
    expect(canRelease("ready")).toBe(true);
    expect(canRelease("in_progress")).toBe(false);
    expect(canRelease("submitted")).toBe(false);
  });
});
