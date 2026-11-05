import { describe, expect, it } from "vitest";

import { optionalResourceKeys, resolveHidden } from "@/lib/present/items";
import { parseHiddenParam, resourceKey } from "@/lib/present/plan";
import { parsePosition, positionStorageKey, serializePosition } from "@/lib/present/sync";

describe("position mémorisée", () => {
  it("relit la diapo et le mode enregistrés", () => {
    const raw = serializePosition({ index: 21, mode: "slides" });
    expect(parsePosition(raw, 40)).toEqual({ index: 21, mode: "slides" });
  });
  it("borne l'index et ignore une valeur invalide", () => {
    expect(parsePosition(serializePosition({ index: 99, mode: "document" }), 10)?.index).toBe(9);
    expect(parsePosition("n'importe quoi", 10)).toBeNull();
    expect(parsePosition(null, 10)).toBeNull();
    expect(parsePosition(JSON.stringify({ index: -1, mode: "slides" }), 10)).toBeNull();
  });
  it("une clé par séance", () => {
    expect(positionStorageKey("mg-present:a")).not.toBe(positionStorageKey("mg-present:b"));
  });
});

describe("choix « Pour moi » côté serveur", () => {
  const resources = [
    { id: "1", title: "Cours" },
    { id: "2", title: "Corrigé : l'étude de cas blanche" },
    { id: "3", title: "Agile, pour aller plus loin" },
  ];
  it("sans choix, corrigés et « pour aller plus loin » ne sont pas projetés", () => {
    expect(resolveHidden(null, null, resources)).toEqual(optionalResourceKeys(resources));
    expect(resolveHidden(null, null, resources).has(resourceKey("2"))).toBe(true);
    expect(resolveHidden(null, null, resources).has(resourceKey("1"))).toBe(false);
  });
  it("le choix enregistré s'applique sans paramètre d'adresse", () => {
    expect([...resolveHidden(null, [], resources)]).toEqual([]);
    expect([...resolveHidden(null, ["x"], resources)]).toEqual(["x"]);
  });
  it("l'adresse prime quand elle porte un choix", () => {
    expect([...resolveHidden(parseHiddenParam("a,b"), ["x"], resources)]).toEqual(["a", "b"]);
    expect(parseHiddenParam(undefined)).toBeNull();
  });
});
