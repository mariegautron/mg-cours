import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { parseStudentsFile } from "./import";

describe("parseStudentsFile", () => {
  it("reconnaît les colonnes par alias tolérant (accents/casse)", () => {
    const csv = "Nom,Prénom,E-mail\nDupont,Jean,jean.dupont@ynov.com\n";
    const rows = parseStudentsFile(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      firstName: "Jean",
      lastName: "Dupont",
      email: "jean.dupont@ynov.com",
      errors: [],
    });
  });

  it("accepte les alias sans accent (Prenom, email)", () => {
    const csv = "Nom,Prenom,email\nMartin,Alice,alice.martin@ynov.com\n";
    const rows = parseStudentsFile(csv);
    expect(rows[0].firstName).toBe("Alice");
  });

  it("signale les champs obligatoires manquants", () => {
    const csv = "Nom,Prénom,Email\n,Jean,jean@ynov.com\nDupont,,\n";
    const rows = parseStudentsFile(csv);
    expect(rows[0].errors).toContain("nom manquant");
    expect(rows[1].errors).toContain("prénom manquant");
  });

  it("signale un e-mail invalide", () => {
    const csv = "Nom,Prénom,Email\nDupont,Jean,pas-un-email\n";
    const rows = parseStudentsFile(csv);
    expect(rows[0].errors).toContain("e-mail invalide");
  });

  it("signale les doublons d'e-mail dans le fichier (insensible à la casse)", () => {
    const csv = "Nom,Prénom,Email\nDupont,Jean,jean@ynov.com\nDupond,Jeanne,JEAN@ynov.com\n";
    const rows = parseStudentsFile(csv);
    expect(rows[0].errors).not.toContain("e-mail en double dans le fichier");
    expect(rows[1].errors).toContain("e-mail en double dans le fichier");
  });

  it("lit numéro étudiant et groupe quand présents", () => {
    const csv = "Nom,Prénom,Email,Numéro étudiant,Groupe\nDupont,Jean,jean@ynov.com,E12345,B2\n";
    const rows = parseStudentsFile(csv);
    expect(rows[0]).toMatchObject({ studentNumber: "E12345", scholarGroup: "B2" });
  });

  it("renvoie un tableau vide pour un fichier vide", () => {
    expect(parseStudentsFile("")).toEqual([]);
  });

  it("parse un vrai classeur XLSX (ArrayBuffer, accents compris)", () => {
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Nom", "Prénom", "Email"],
      ["Dupont", "Jean", "jean.dupont@ynov.com"],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Étudiants");
    const buffer: ArrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

    const rows = parseStudentsFile(buffer);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ firstName: "Jean", lastName: "Dupont", errors: [] });
  });
});
