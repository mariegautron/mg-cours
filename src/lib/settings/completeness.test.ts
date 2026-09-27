import { describe, expect, it } from "vitest";

import { profileCompleteness } from "./completeness";
import type { Tables } from "@/types/db";

const base: Tables<"teacher_profile"> = {
  id: "1",
  owner_id: "u",
  legal_name: "Marie Gautron",
  address: "1 rue de l’Enseignement, 44000 Nantes",
  siret: "80442673200033",
  vat_number: null,
  activity_number: null,
  vat_exempt: true,
  bank_details: "IBAN : FR76 3000 6000 0112 3456 7890 189",
  email: "marie@local.test",
  phone: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("profileCompleteness", () => {
  it("renvoie 100 % et aucun manquant pour un profil complet (TVA non applicable)", () => {
    const r = profileCompleteness(base);
    expect(r.percent).toBe(100);
    expect(r.missing).toEqual([]);
  });

  it("renvoie 0 % pour un profil absent", () => {
    expect(profileCompleteness(null).percent).toBe(0);
  });

  it("signale un SIRET invalide (clé de contrôle) comme manquant", () => {
    const r = profileCompleteness({ ...base, siret: "12345678900000" });
    expect(r.missing).toContain("SIRET valide");
  });

  it("exige un n° de TVA quand la franchise n'est pas cochée", () => {
    const r = profileCompleteness({ ...base, vat_exempt: false, vat_number: null });
    expect(r.missing).toContain("N° de TVA (ou TVA non applicable)");
    expect(
      profileCompleteness({ ...base, vat_exempt: false, vat_number: "FR123" }).missing,
    ).toEqual([]);
  });

  it("exige un IBAN valide dans le RIB", () => {
    const r = profileCompleteness({ ...base, bank_details: "IBAN : FR76 1234" });
    expect(r.missing).toContain("IBAN valide");
  });
});
