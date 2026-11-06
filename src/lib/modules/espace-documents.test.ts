import { describe, expect, it } from "vitest";

import { documentKind, parseEspace, safeDownloadName, selectDocuments } from "./espace";

const f = (name: string, mime: string) => ({ name, path: `o/${name}`, mime, size: 2048 });

describe("selectDocuments", () => {
  it("garde les fichiers non image et écarte les images", () => {
    const out = selectDocuments([
      f("modele.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      f("schema.png", "image/png"),
      f("cours.pdf", "application/pdf"),
    ]);
    expect(out.map((d) => d.name)).toEqual(["modele.docx", "cours.pdf"]);
  });
  it("écarte les extensions non prévues", () => {
    expect(selectDocuments([f("script.exe", "application/octet-stream")])).toEqual([]);
  });
});

describe("parseEspace", () => {
  const base = (resource: object) => ({
    espace: { courses: [{ number: 1, title: "S1", resources: [resource] }] },
  });
  it("ancien instantané sans documents : liste vide", () => {
    const e = parseEspace(base({ title: "Fiche", images: [] }));
    expect(e?.courses[0].resources[0].documents).toEqual([]);
  });
  it("relit les documents et refuse les images", () => {
    const e = parseEspace(
      base({
        title: "Fiche",
        documents: [
          { name: "a.pdf", path: "p/a.pdf", mime: "application/pdf", size: 10 },
          { name: "b.png", path: "p/b.png", mime: "image/png", size: 10 },
          { name: "c.pdf" },
        ],
      }),
    );
    expect(e?.courses[0].resources[0].documents.map((d) => d.name)).toEqual(["a.pdf"]);
  });
});

describe("safeDownloadName", () => {
  it("retire accents, guillemets, séparateurs et sauts de ligne", () => {
    expect(safeDownloadName('Dossier de cadrage "v2"\r\n.docx')).toBe(
      "Dossier-de-cadrage-v2-.docx",
    );
    expect(safeDownloadName("../../etc/passwd")).toBe("passwd");
    expect(safeDownloadName("Éléments.pdf")).toBe("Elements.pdf");
  });
  it("repli si vide", () => {
    expect(safeDownloadName("///")).toBe("document");
  });
});

describe("documentKind", () => {
  it("nomme le type", () => {
    expect(documentKind("a.DOCX")).toBe("Word");
    expect(documentKind("a.pdf")).toBe("PDF");
  });
});
