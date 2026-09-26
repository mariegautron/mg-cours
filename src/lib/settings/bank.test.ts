import { describe, expect, it } from "vitest";

import { formatBankDetails, formatSiret, parseBankDetails } from "./bank";

const IBAN = "FR7630006000011234567890189";

describe("parseBankDetails", () => {
  it("sépare IBAN et BIC d'un RIB libre", () => {
    expect(parseBankDetails(`IBAN ${IBAN} BIC BNPAFRPP`)).toEqual({
      iban: "FR76 3000 6000 0112 3456 7890 189",
      bic: "BNPAFRPP",
    });
  });

  it("conserve un RIB non reconnu dans le champ IBAN", () => {
    expect(parseBankDetails(" RIB à venir ")).toEqual({ iban: "RIB à venir", bic: "" });
  });

  it("renvoie des champs vides sans RIB", () => {
    expect(parseBankDetails(null)).toEqual({ iban: "", bic: "" });
  });
});

describe("formatBankDetails", () => {
  it("recompose un RIB relisible", () => {
    const text = formatBankDetails(IBAN, "bnpa frpp");
    expect(text).toBe("IBAN : FR76 3000 6000 0112 3456 7890 189\nBIC : BNPAFRPP");
    expect(parseBankDetails(text)).toEqual({
      iban: "FR76 3000 6000 0112 3456 7890 189",
      bic: "BNPAFRPP",
    });
  });

  it("renvoie une chaîne vide sans IBAN ni BIC", () => {
    expect(formatBankDetails("", "")).toBe("");
  });
});

describe("formatSiret", () => {
  it("groupe un SIRET de 14 chiffres", () => {
    expect(formatSiret("80442673200033")).toBe("804 426 732 00033");
  });
});
