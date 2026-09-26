import { describe, expect, it } from "vitest";

import { profileSchema, schoolSchema } from "./schema";

const profile = {
  legalName: "Marie Gautron",
  address: "",
  siret: "",
  vatNumber: "",
  vatExempt: true,
  bankDetails: "",
  email: "",
  phone: "",
};

describe("profileSchema", () => {
  it("accepte un SIRET avec espaces et le normalise", () => {
    const r = profileSchema.parse({ ...profile, siret: "804 426 732 00033" });
    expect(r.siret).toBe("80442673200033");
  });

  it("refuse un SIRET qui n'a pas 14 chiffres", () => {
    expect(profileSchema.safeParse({ ...profile, siret: "12345" }).success).toBe(false);
  });

  it("accepte un SIRET vide", () => {
    expect(profileSchema.parse(profile).siret).toBe("");
  });
});

describe("schoolSchema", () => {
  it("exige un nom et valide l'e-mail de facturation", () => {
    expect(
      schoolSchema.safeParse({
        name: "",
        siret: "",
        address: "",
        billingEmail: "",
        paIdentifier: "",
      }).success,
    ).toBe(false);
    expect(
      schoolSchema.safeParse({
        name: "YNOV",
        siret: "",
        address: "",
        billingEmail: "pas-un-mail",
        paIdentifier: "",
      }).success,
    ).toBe(false);
  });
});
