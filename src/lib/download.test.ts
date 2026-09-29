import { describe, expect, it } from "vitest";

import { downloadLabels, filenameFromDisposition } from "@/lib/download";

describe("filenameFromDisposition", () => {
  it("lit le nom simple entre guillemets", () => {
    expect(filenameFromDisposition('attachment; filename="facture-26-001.pdf"', "x.pdf")).toBe(
      "facture-26-001.pdf",
    );
  });

  it("préfère filename* (UTF-8) au nom simple", () => {
    expect(
      filenameFromDisposition(
        `attachment; filename="enonce.html"; filename*=UTF-8''%C3%A9nonc%C3%A9%20final.html`,
        "x",
      ),
    ).toBe("énoncé final.html");
  });

  it("accepte un nom sans guillemets", () => {
    expect(filenameFromDisposition("attachment; filename=grille.pdf", "x")).toBe("grille.pdf");
  });

  it("retombe sur le nom par défaut sans en-tête ou avec un encodage invalide", () => {
    expect(filenameFromDisposition(null, "document.pdf")).toBe("document.pdf");
    expect(filenameFromDisposition("attachment", "document.pdf")).toBe("document.pdf");
    expect(filenameFromDisposition("attachment; filename*=UTF-8''%E0%A4%A", "d.pdf")).toBe("d.pdf");
  });
});

describe("downloadLabels", () => {
  it("donne un libellé d'attente au participe présent, avec l'objet", () => {
    expect(downloadLabels("pdf").pending).toBe("Préparation du PDF…");
    expect(downloadLabels("zip").pending).toBe("Préparation de l’archive…");
    expect(downloadLabels("pdf").done).toBe("PDF téléchargé.");
  });
});
