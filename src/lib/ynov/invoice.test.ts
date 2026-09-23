import { describe, expect, it } from "vitest";

import {
  buildInvoiceSnapshot,
  computeAmounts,
  computeDueDate,
  extractIban,
  invoiceBlockers,
  isValidIban,
  missingInvoiceData,
  nextInvoiceNumber,
  REQUIRED_ADMIN_DOCS,
  type InvoiceContext,
} from "./invoice";

const allDocs = Object.fromEntries(REQUIRED_ADMIN_DOCS.map((d) => [d.key, true]));
const IBAN = "FR7630006000011234567890189";

const ok = (over: Partial<InvoiceContext> = {}): InvoiceContext => ({
  module: {
    name: "Méthodologies Agile & Scrum",
    ycode: "A2627_4752",
    year: 2026,
    total_hours: 21,
    hourly_rate: null,
    purchase_order_ref: "PO-2026-12345",
    iceberg_state: "outline_sent",
    admin_docs: allDocs,
    end_date: "2026-10-30",
    first_session_date: "2026-10-12",
  },
  notes: { satisfied: true, enteredTotal: 3, requiredTotal: 3 },
  profile: {
    legal_name: "Marie Gautron",
    address: "1 rue de l'Enseignement 44000 Nantes",
    siret: "123 456 789 00012",
    vat_number: null,
    vat_exempt: true,
    hourly_rate: 50,
    bank_details: `IBAN ${IBAN} BIC BNPAFRPP`,
    email: "m@x.fr",
    phone: null,
  },
  school: {
    name: "YNOV CAMPUS",
    siret: "80442673200033",
    address: "Nantes",
    billing_email: "fournisseurs-nantes@ynov.com",
    pa_identifier: "804426732_YZ_YNOV_NAN",
  },
  ...over,
});

describe("invoiceBlockers", () => {
  it("aucun blocage quand tout est réuni", () => {
    expect(invoiceBlockers(ok())).toEqual([]);
  });

  it("bloque si la trame n'est pas envoyée", () => {
    const ctx = ok();
    ctx.module.iceberg_state = "outline_generated";
    expect(invoiceBlockers(ctx)).toContain("La trame pédagogique n’a pas été envoyée.");
  });

  it("bloque si le nombre de notes est insuffisant, avec le décompte", () => {
    const r = invoiceBlockers(
      ok({ notes: { satisfied: false, enteredTotal: 1, requiredTotal: 3 } }),
    );
    expect(r).toContain("Nombre de notes insuffisant (1/3 requises).");
  });

  it("liste chaque document administratif manquant", () => {
    const ctx = ok();
    ctx.module.admin_docs = { fiche_positionnement: true };
    const r = invoiceBlockers(ctx);
    expect(r).toHaveLength(REQUIRED_ADMIN_DOCS.length - 1);
    expect(r).toContain("Document manquant : Notes saisies dans Hyperplanning.");
  });

  it("cumule tous les blocages", () => {
    const ctx = ok({ notes: { satisfied: false, enteredTotal: 0, requiredTotal: 3 } });
    ctx.module.iceberg_state = "module_created";
    ctx.module.admin_docs = {};
    expect(invoiceBlockers(ctx)).toHaveLength(2 + REQUIRED_ADMIN_DOCS.length);
  });

  it("une trame validée ou une étape ultérieure débloque toujours la condition trame", () => {
    for (const state of ["outline_sent", "grades_in_hp", "invoice_ready", "paid"] as const) {
      const ctx = ok();
      ctx.module.iceberg_state = state;
      expect(invoiceBlockers(ctx)).toEqual([]);
    }
  });
});

describe("IBAN", () => {
  it("valide un IBAN correct (modulo 97) avec ou sans espaces", () => {
    expect(isValidIban(IBAN)).toBe(true);
    expect(isValidIban("FR76 3000 6000 0112 3456 7890 189")).toBe(true);
  });

  it("refuse un IBAN altéré", () => {
    expect(isValidIban("FR7630006000011234567890188")).toBe(false);
    expect(isValidIban("n'importe quoi")).toBe(false);
  });

  it("extrait l'IBAN d'un RIB libre, même suivi d'un BIC ou avec espaces", () => {
    expect(extractIban(`Titulaire Marie\nIBAN : ${IBAN}\nBIC : BNPAFRPP`)).toBe(IBAN);
    expect(extractIban("IBAN FR76 3000 6000 0112 3456 7890 189 BIC BNPAFRPP")).toBe(IBAN);
    expect(extractIban(`${IBAN}BNPAFRPP`)).toBe(IBAN);
  });

  it("renvoie null sans IBAN valide", () => {
    expect(extractIban(null)).toBeNull();
    expect(extractIban("pas de rib ici")).toBeNull();
    expect(extractIban("FR7630006000011234567890188")).toBeNull();
  });
});

describe("missingInvoiceData", () => {
  it("rien ne manque avec un contexte complet", () => {
    expect(missingInvoiceData(ok())).toEqual([]);
  });

  it("signale profil, école et bon de commande absents", () => {
    const r = missingInvoiceData(ok({ profile: null, school: null }));
    expect(r).toContain("Profil prestataire non renseigné (Réglages).");
    expect(r).toContain("École du module non renseignée.");
  });

  it("exige la référence de bon de commande, le YCODE et l'IBAN", () => {
    const ctx = ok();
    ctx.module.purchase_order_ref = null;
    ctx.module.ycode = null;
    ctx.profile!.bank_details = "RIB à venir";
    const r = missingInvoiceData(ctx);
    expect(r).toContain("Référence de bon de commande du module.");
    expect(r).toContain("YCODE du module.");
    expect(r).toContain("IBAN valide dans le RIB du prestataire.");
  });

  it("exige un n° de TVA sauf franchise 293 B", () => {
    const ctx = ok();
    ctx.profile!.vat_exempt = false;
    expect(missingInvoiceData(ctx)).toContain("N° de TVA du prestataire (ou cocher l’art. 293 B).");
    ctx.profile!.vat_number = "FR12123456789";
    expect(missingInvoiceData(ctx)).toEqual([]);
  });

  it("exige un tarif : celui du module prime, sinon celui du profil", () => {
    const ctx = ok();
    ctx.profile!.hourly_rate = null;
    expect(missingInvoiceData(ctx)).toContain("Tarif horaire (profil ou module).");
    ctx.module.hourly_rate = 60;
    expect(missingInvoiceData(ctx)).toEqual([]);
  });
});

describe("computeAmounts", () => {
  it("exemple de la doc : 21 h × 50 € = 1 050 € HT, TVA 20 % = 210 €, TTC 1 260 €", () => {
    expect(computeAmounts({ hours: 21, unitPriceExVat: 50, vatExempt: false })).toEqual({
      amountExVat: 1050,
      vatRate: 20,
      vatAmount: 210,
      amountIncVat: 1260,
    });
  });

  it("exemple 21 h × 70 € = 1 470 € HT, TTC 1 764 €", () => {
    const r = computeAmounts({ hours: 21, unitPriceExVat: 70, vatExempt: false });
    expect(r.amountExVat).toBe(1470);
    expect(r.vatAmount).toBe(294);
    expect(r.amountIncVat).toBe(1764);
  });

  it("franchise en base : TVA 0, TTC = HT", () => {
    const r = computeAmounts({ hours: 10, unitPriceExVat: 45.5, vatExempt: true });
    expect(r).toEqual({ amountExVat: 455, vatRate: 0, vatAmount: 0, amountIncVat: 455 });
  });

  it("arrondit au centime (pas de dérive flottante)", () => {
    const r = computeAmounts({ hours: 3, unitPriceExVat: 33.33, vatExempt: false });
    expect(r.amountExVat).toBe(99.99);
    expect(r.vatAmount).toBe(20);
    expect(r.amountIncVat).toBe(119.99);
  });
});

describe("computeDueDate (30 jours fin de mois)", () => {
  it.each([
    ["2026-10-31", "2026-11-30"],
    ["2026-10-01", "2026-10-31"],
    ["2026-10-02", "2026-11-30"],
    ["2026-12-15", "2027-01-31"],
    ["2027-01-30", "2027-03-31"],
  ])("émission %s → échéance %s", (issued, due) => {
    expect(computeDueDate(issued)).toBe(due);
  });
});

describe("nextInvoiceNumber", () => {
  it("commence à 001 pour l'année", () => {
    expect(nextInvoiceNumber(2026, [])).toBe("2026-001");
    expect(nextInvoiceNumber(2026, ["2025-014"])).toBe("2026-001");
  });

  it("incrémente le maximum existant de l'année", () => {
    expect(nextInvoiceNumber(2026, ["2026-001", "2026-002"])).toBe("2026-003");
    expect(nextInvoiceNumber(2026, ["2026-001", "2026-007", "2026-003"])).toBe("2026-008");
  });

  it("ignore les numéros mal formés", () => {
    expect(nextInvoiceNumber(2026, ["2026-abc", "2026-004"])).toBe("2026-005");
  });
});

describe("buildInvoiceSnapshot", () => {
  it("fige vendeur, acheteur, ligne, montants, échéance et mention 293 B", () => {
    const s = buildInvoiceSnapshot(ok(), { number: "2026-001", issuedOn: "2026-10-31" });
    expect(s.number).toBe("2026-001");
    expect(s.dueOn).toBe("2026-11-30");
    expect(s.seller.siret).toBe("12345678900012");
    expect(s.seller.iban).toBe(IBAN);
    expect(s.buyer.siret).toBe("80442673200033");
    expect(s.purchaseOrderRef).toBe("PO-2026-12345");
    expect(s.line.designation).toBe(
      "Prestation d’enseignement – Module Méthodologies Agile & Scrum (YCODE : A2627_4752) – 21 heures",
    );
    expect(s.amounts.amountIncVat).toBe(1050);
    expect(s.exemptionMention).toBe("TVA non applicable, art. 293 B du CGI");
  });

  it("assujettie à la TVA : 20 % et pas de mention d'exonération", () => {
    const ctx = ok();
    ctx.profile!.vat_exempt = false;
    ctx.profile!.vat_number = "FR12123456789";
    const s = buildInvoiceSnapshot(ctx, { number: "2026-002", issuedOn: "2026-10-31" });
    expect(s.amounts.amountIncVat).toBe(1260);
    expect(s.exemptionMention).toBeNull();
  });
});
