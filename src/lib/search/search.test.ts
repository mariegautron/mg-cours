import { describe, expect, it } from "vitest";

import { groupResults, matchRank, normalize, type SearchCandidate } from "./search";

const c = (kind: SearchCandidate["kind"], id: string, label: string, terms?: string[]) => ({
  kind,
  id,
  label,
  terms,
});

describe("normalize", () => {
  it("ignore casse, accents et espaces multiples", () => {
    expect(normalize("  Éloïse   ÇA ")).toBe("eloise ca");
    expect(normalize("Cœur")).toBe("coeur");
  });
});

describe("matchRank", () => {
  it("préfixe (0) avant sous-chaîne (1), sinon null", () => {
    expect(matchRank("dup", ["Dupont Marie"])).toBe(0);
    expect(matchRank("mar", ["Dupont Marie"])).toBe(1);
    expect(matchRank("zzz", ["Dupont Marie"])).toBeNull();
  });
  it("cherche aussi dans les autres textes (prénom nom / nom prénom)", () => {
    expect(matchRank("dupont", ["Marie Dupont", "Dupont Marie"])).toBe(0);
  });
  it("insensible aux accents", () => {
    expect(matchRank("elo", ["Éloïse"])).toBe(0);
  });
});

describe("groupResults", () => {
  const all = [
    c("student", "s1", "Marie Dupont", ["Dupont Marie"]),
    c("student", "s2", "Paul Durand", ["Durand Paul"]),
    c("module", "m1", "Introduction au design"),
    c("module", "m2", "Design système"),
    c("resource", "r1", "Grille de design"),
    c("question", "q1", "Question sans rapport"),
  ];
  it("rien sous 2 caractères", () => {
    expect(groupResults(all, "d")).toEqual([]);
  });
  it("groupes dans l'ordre fixe, liens vers les fiches", () => {
    const g = groupResults(all, "design");
    expect(g.map((x) => x.kind)).toEqual(["module", "resource"]);
    expect(g[0].results[0].href).toBe("/modules/m2");
    expect(g[1].results[0].href).toBe("/resources/r1");
  });
  it("préfixe avant sous-chaîne, puis ordre alphabétique", () => {
    const [mods] = groupResults(all, "design");
    expect(mods.results.map((r) => r.id)).toEqual(["m2", "m1"]);
    const ties = groupResults(
      [c("module", "b", "Beta design"), c("module", "a", "Alpha design")],
      "design",
    );
    expect(ties[0].results.map((r) => r.id)).toEqual(["a", "b"]);
  });
  it("trouve un·e étudiant·e par nom ou prénom, sans accent", () => {
    expect(groupResults(all, "DUPONT")[0].results[0].id).toBe("s1");
    expect(groupResults(all, "marie")[0].results[0].id).toBe("s1");
  });
  it("limite à 5 par groupe", () => {
    const many = Array.from({ length: 9 }, (_, i) => c("module", `m${i}`, `Module ${i}`));
    expect(groupResults(many, "module")[0].results).toHaveLength(5);
  });
});
