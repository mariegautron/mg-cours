import { describe, expect, it } from "vitest";

import {
  datesAfterToggle,
  dateNote,
  simpleInvoiceStatus,
  stateAfterToggle,
  validDate,
} from "./simple";

describe("simpleInvoiceStatus", () => {
  it("à déposer, à envoyer, envoyée, payée", () => {
    expect(simpleInvoiceStatus({ hasFile: false, state: "admin_docs_ok" })).toBe("to_deposit");
    expect(simpleInvoiceStatus({ hasFile: true, state: "admin_docs_ok" })).toBe("to_send");
    expect(simpleInvoiceStatus({ hasFile: true, state: "invoice_sent" })).toBe("sent");
    expect(simpleInvoiceStatus({ hasFile: true, state: "paid" })).toBe("paid");
  });
  it("une case cochée prime sur l'absence de fichier", () => {
    expect(simpleInvoiceStatus({ hasFile: false, state: "invoice_sent" })).toBe("sent");
    expect(simpleInvoiceStatus({ hasFile: false, state: "paid" })).toBe("paid");
  });
});

describe("stateAfterToggle", () => {
  it("cocher « Envoyée » avance sans jamais reculer", () => {
    expect(stateAfterToggle("admin_docs_ok", "sent", true)).toBe("invoice_sent");
    expect(stateAfterToggle("paid", "sent", true)).toBe("paid");
  });
  it("cocher « Payée » mène à payée", () => {
    expect(stateAfterToggle("invoice_sent", "paid", true)).toBe("paid");
    expect(stateAfterToggle("grades_in_mg", "paid", true)).toBe("paid");
  });
  it("décocher « Payée » revient à envoyée ; sans effet si elle n'était pas payée", () => {
    expect(stateAfterToggle("paid", "paid", false)).toBe("invoice_sent");
    expect(stateAfterToggle("invoice_sent", "paid", false)).toBe("invoice_sent");
  });
  it("décocher « Envoyée » revient à « facture à générer » (et décoche payée)", () => {
    expect(stateAfterToggle("invoice_sent", "sent", false)).toBe("invoice_ready");
    expect(stateAfterToggle("paid", "sent", false)).toBe("invoice_ready");
    expect(stateAfterToggle("admin_docs_ok", "sent", false)).toBe("admin_docs_ok");
  });
});

describe("datesAfterToggle", () => {
  const dates = { sentOn: "2026-06-03", paidOn: null };
  it("cocher enregistre la date ; payée garde la date d'envoi connue", () => {
    expect(datesAfterToggle({ sentOn: null, paidOn: null }, "sent", true, "2026-06-03")).toEqual({
      sentOn: "2026-06-03",
      paidOn: null,
    });
    expect(datesAfterToggle(dates, "paid", true, "2026-06-28")).toEqual({
      sentOn: "2026-06-03",
      paidOn: "2026-06-28",
    });
    expect(datesAfterToggle({ sentOn: null, paidOn: null }, "paid", true, "2026-06-28")).toEqual({
      sentOn: "2026-06-28",
      paidOn: "2026-06-28",
    });
  });
  it("décocher efface la date ; décocher envoyée efface aussi celle du paiement", () => {
    expect(
      datesAfterToggle({ sentOn: "2026-06-03", paidOn: "2026-06-28" }, "paid", false, "x"),
    ).toEqual({
      sentOn: "2026-06-03",
      paidOn: null,
    });
    expect(
      datesAfterToggle({ sentOn: "2026-06-03", paidOn: "2026-06-28" }, "sent", false, "x"),
    ).toEqual({
      sentOn: null,
      paidOn: null,
    });
  });
});

describe("validDate / dateNote", () => {
  it("date valide ou repli", () => {
    expect(validDate("2026-06-03", "2026-07-01")).toBe("2026-06-03");
    expect(validDate("03/06/2026", "2026-07-01")).toBe("2026-07-01");
    expect(validDate("2026-13-45", "2026-07-01")).toBe("2026-07-01");
    expect(validDate(null, "2026-07-01")).toBe("2026-07-01");
  });
  it("libellé daté", () => {
    expect(dateNote("envoyée", "2026-06-03")).toBe("envoyée le 03/06");
    expect(dateNote("payée", null)).toBe("");
  });
});
