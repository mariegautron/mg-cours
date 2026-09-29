import { describe, expect, it } from "vitest";

import { searchResource, searchResources, searchTerms, stripMarkdown } from "./search";

const resource = {
  title: "Atelier RGAA",
  description: "Auditer un site",
  tags: ["accessibilité", "Numérique"],
  content: "# Objectifs\n\nComprendre l'**éthique** du numérique et les [critères](http://x.fr).",
};

describe("searchTerms", () => {
  it("normalise et dédoublonne", () => {
    expect(searchTerms("  Éthique  éthique WEB ")).toEqual(["ethique", "web"]);
    expect(searchTerms("   ")).toEqual([]);
  });
});

describe("stripMarkdown", () => {
  it("retire titres, emphases et liens", () => {
    expect(stripMarkdown(resource.content)).toBe(
      "Objectifs Comprendre l'éthique du numérique et les critères.",
    );
  });
});

describe("searchResource", () => {
  it("sans recherche, tout correspond sans extrait", () => {
    expect(searchResource(resource, "  ")).toEqual({ matched: true, excerpt: null });
  });

  it("trouve dans le contenu sans tenir compte des accents ni de la casse", () => {
    const { matched, excerpt } = searchResource(resource, "ETHIQUE");
    expect(matched).toBe(true);
    expect(excerpt).toMatchObject({ field: "content", match: "éthique" });
    expect(excerpt?.before).toContain("Comprendre");
    expect(excerpt?.after).toContain("du numérique");
  });

  it("trouve dans les tags", () => {
    const { matched, excerpt } = searchResource(resource, "accessibilite");
    expect(matched).toBe(true);
    expect(excerpt).toMatchObject({ field: "tags", match: "accessibilité" });
  });

  it("titre seul : correspond, pas d'extrait", () => {
    expect(searchResource(resource, "atelier")).toEqual({ matched: true, excerpt: null });
  });

  it("exige tous les mots, répartis sur plusieurs champs", () => {
    expect(searchResource(resource, "atelier ethique").matched).toBe(true);
    expect(searchResource(resource, "atelier docker").matched).toBe(false);
  });

  it("ne trouve rien d'absent", () => {
    expect(searchResource({ title: "Notes" }, "docker")).toEqual({
      matched: false,
      excerpt: null,
    });
  });

  it("tronque l'extrait avec des points de suspension", () => {
    const long = `${"mot ".repeat(40)}cible${" fin".repeat(40)}`;
    const { excerpt } = searchResource({ title: "T", content: long }, "cible");
    expect(excerpt?.before.startsWith("…")).toBe(true);
    expect(excerpt?.after.endsWith("…")).toBe(true);
    expect(excerpt?.match).toBe("cible");
  });

  it("garde l'alignement malgré les accents décomposés", () => {
    const { excerpt } = searchResource({ title: "T", content: "Créée à l'été : élève" }, "eleve");
    expect(excerpt?.match).toBe("élève");
  });
});

describe("searchResources", () => {
  it("filtre et conserve l'extrait", () => {
    const list = [resource, { title: "Autre", content: "rien" }];
    const found = searchResources(list, "critères");
    expect(found).toHaveLength(1);
    expect(found[0].resource.title).toBe("Atelier RGAA");
    expect(searchResources(list, "")).toHaveLength(2);
  });
});
