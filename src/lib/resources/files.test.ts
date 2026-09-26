import { describe, expect, it } from "vitest";

import { parseResourceFiles, resolveImageSrc, upsertFile, type ResourceFile } from "./files";

const file = (name: string, path = `u/r/${name}`): ResourceFile => ({
  path,
  name,
  size: 10,
  mime: "image/png",
});

describe("parseResourceFiles", () => {
  it("garde les entrées valides et ignore le reste", () => {
    expect(parseResourceFiles([file("a.png"), { name: "x" }, 3])).toEqual([file("a.png")]);
    expect(parseResourceFiles(null)).toEqual([]);
    expect(parseResourceFiles({})).toEqual([]);
  });
});

describe("upsertFile", () => {
  it("ajoute un nouveau fichier", () => {
    expect(upsertFile([file("a.png")], file("b.png"))).toEqual({
      files: [file("a.png"), file("b.png")],
      replacedPath: undefined,
    });
  });

  it("remplace un fichier du même nom et renvoie l'ancien chemin", () => {
    const result = upsertFile([file("a.png", "u/r/1-a.png")], file("a.png", "u/r/2-a.png"));
    expect(result.files).toEqual([file("a.png", "u/r/2-a.png")]);
    expect(result.replacedPath).toBe("u/r/1-a.png");
  });
});

describe("resolveImageSrc", () => {
  it("garde les URL absolues", () => {
    expect(resolveImageSrc("r1", "https://x.fr/a.png")).toBe("https://x.fr/a.png");
    expect(resolveImageSrc("r1", "data:image/png;base64,AA")).toBe("data:image/png;base64,AA");
  });

  it("résout un nom de fichier vers la route de la ressource", () => {
    expect(resolveImageSrc("r1", "schema.png")).toBe("/api/resources/r1/files/schema.png");
  });

  it("gère un chemin relatif encodé d'export Notion", () => {
    expect(resolveImageSrc("r1", "Page%20titre/mon%20sch%C3%A9ma.png")).toBe(
      `/api/resources/r1/files/${encodeURIComponent("mon schéma.png")}`,
    );
  });

  it("ne détourne pas vers un autre schéma", () => {
    expect(resolveImageSrc("r1", "javascript:alert(1)")).toBe(
      `/api/resources/r1/files/${encodeURIComponent("javascript:alert(1)")}`,
    );
  });
});
