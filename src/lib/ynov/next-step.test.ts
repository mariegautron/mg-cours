import { describe, expect, it } from "vitest";

import type { InvoiceContext } from "./invoice";
import { nextStep } from "./next-step";

const complete: InvoiceContext = {
  module: {
    name: "Module",
    ycode: "Y1",
    year: 2026,
    total_hours: 21,
    hourly_rate: 50,
    purchase_order_ref: "BC-1",
    iceberg_state: "outline_sent",
    admin_docs: {
      fiche_positionnement: true,
      supports_moodle: true,
      sujets_grilles_moodle: true,
      notes_hyperplanning: true,
    },
    end_date: null,
    first_session_date: null,
  },
  notes: { satisfied: true, enteredTotal: 3, requiredTotal: 3 },
  profile: {
    legal_name: "Marie",
    address: "1 rue",
    siret: "12345678901234",
    vat_number: null,
    vat_exempt: true,
    bank_details: "FR7630006000011234567890189",
    email: null,
    phone: null,
  },
  school: {
    name: "YNOV",
    siret: "98765432109876",
    address: "2 rue",
    billing_email: "a@b.fr",
    pa_identifier: null,
  },
};

const with_ = (patch: Partial<InvoiceContext>): InvoiceContext => ({ ...complete, ...patch });

describe("nextStep", () => {
  it("tout est prêt : générer la facture", () => {
    expect(nextStep(complete, null)).toEqual({
      label: "Prochaine étape : générer la facture",
      done: false,
      reasons: [],
    });
  });

  it("progression non envoyée : premier blocage, avec toutes les raisons", () => {
    const ctx = with_({
      module: { ...complete.module, iceberg_state: "module_created" },
      notes: { satisfied: false, enteredTotal: 1, requiredTotal: 3 },
    });
    const step = nextStep(ctx, null);
    expect(step.label).toBe("Prochaine étape : envoyer la progression pédagogique");
    expect(step.reasons).toHaveLength(2);
  });

  it("notes insuffisantes", () => {
    const step = nextStep(
      with_({ notes: { satisfied: false, enteredTotal: 1, requiredTotal: 3 } }),
      null,
    );
    expect(step.label).toBe("Prochaine étape : saisir les notes manquantes (1/3 requises)");
  });

  it("document administratif manquant", () => {
    const ctx = with_({
      module: {
        ...complete.module,
        admin_docs: { ...complete.module.admin_docs, supports_moodle: false },
      },
    });
    expect(nextStep(ctx, null).label).toBe(
      "Prochaine étape : cocher le document administratif « Supports déposés sur Moodle »",
    );
  });

  it("processus OK mais données de facturation manquantes", () => {
    const step = nextStep(with_({ school: null }), null);
    expect(step.label).toMatch(/compléter les informations de facturation \(1 manquante\)/);
    expect(step.reasons).toEqual(["École du module non renseignée."]);
  });

  it("selon le statut de la facture", () => {
    expect(nextStep(complete, { status: "draft" }).label).toBe(
      "Prochaine étape : envoyer la facture",
    );
    expect(nextStep(complete, { status: "sent" }).label).toBe(
      "Prochaine étape : suivre le paiement de la facture",
    );
    expect(nextStep(complete, { status: "paid" })).toEqual({
      label: "Facture payée",
      done: true,
      reasons: [],
    });
  });
});
