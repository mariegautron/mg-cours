import { extract } from "@stafyniaksacha/facturx";
import { describe, expect, it } from "vitest";

import { assertValidXml, buildFacturX, snapshotToXml } from "./facturx";
import {
  buildInvoiceSnapshot,
  type InvoiceContext,
  type InvoiceSnapshot,
} from "@/lib/ynov/invoice";

const IBAN = "FR7630006000011234567890189";

const ctx = (vatExempt: boolean): InvoiceContext => ({
  module: {
    name: "Méthodologies Agile & Scrum",
    ycode: "A2627_4752",
    year: 2026,
    total_hours: 21,
    hourly_rate: 50,
    purchase_order_ref: "PO-2026-12345",
    iceberg_state: "outline_sent",
    admin_docs: {},
    end_date: "2026-10-30",
    first_session_date: "2026-10-12",
  },
  notes: { satisfied: true, enteredTotal: 3, requiredTotal: 3 },
  profile: {
    legal_name: "Marie Gautron",
    address: "1 rue de l'Enseignement 44000 Nantes",
    siret: "123 456 789 00012",
    vat_number: vatExempt ? null : "FR12123456789",
    vat_exempt: vatExempt,
    bank_details: `IBAN ${IBAN}`,
    email: "marie@example.fr",
    phone: null,
  },
  school: {
    name: "YNOV CAMPUS & Co <Nantes>",
    siret: "80442673200033",
    address: "Nantes",
    billing_email: "fournisseurs-nantes@ynov.com",
    pa_identifier: "804426732_YZ_YNOV_NAN",
  },
});

const snap = (vatExempt: boolean): InvoiceSnapshot =>
  buildInvoiceSnapshot(ctx(vatExempt), { number: "2026-001", issuedOn: "2026-10-31" });

describe("Factur-X EN 16931", () => {
  it.each([
    ["franchise en base (art. 293 B)", true],
    ["assujettie à la TVA 20 %", false],
  ])("XML valide XSD + Schematron — %s", async (_label, exempt) => {
    await expect(assertValidXml(snapshotToXml(snap(exempt)))).resolves.toBeUndefined();
  });

  it("échappe les caractères spéciaux XML du nom de l'école", () => {
    const xml = snapshotToXml(snap(true));
    expect(xml).toContain("YNOV CAMPUS &amp; Co &lt;Nantes&gt;");
  });

  it("rejette un XML incohérent (montants faux)", async () => {
    const bad = snapshotToXml(snap(false)).replace(
      "<ram:GrandTotalAmount>1260.00</ram:GrandTotalAmount>",
      "<ram:GrandTotalAmount>9999.00</ram:GrandTotalAmount>",
    );
    await expect(assertValidXml(bad)).rejects.toThrow(/invalide/);
  });

  it("produit un PDF avec le XML embarqué, retrouvable à l'extraction", async () => {
    const { pdf, xml } = await buildFacturX(snap(true));
    expect(Buffer.from(pdf.subarray(0, 4)).toString()).toBe("%PDF");
    const extracted = await extract({ pdf: Buffer.from(pdf) });
    expect(extracted.xml).toContain("<ram:ID>2026-001</ram:ID>");
    expect(extracted.xml).toContain("PO-2026-12345");
    const norm = (x: string) => x.replace(/encoding="[^"]*"/i, "").replace(/\s/g, "");
    expect(norm(extracted.xml)).toBe(norm(xml));
    await expect(assertValidXml(extracted.xml)).resolves.toBeUndefined();
  }, 30_000);
});
