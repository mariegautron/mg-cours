/**
 * Facturation YNOV — logique pure (zone critique, testée exhaustivement).
 * Règles : docs/YNOV-RULES.md §2, §4, §5.
 */
import { isOutlineSent, type IcebergState } from "./iceberg";
import type { NoteProgress } from "./notation";

export const VAT_RATE = 20;
export const VAT_EXEMPT_MENTION = "TVA non applicable, art. 293 B du CGI";

/** Documents administratifs exigés par YNOV avant facturation. */
export const REQUIRED_ADMIN_DOCS: { key: string; label: string }[] = [
  { key: "fiche_positionnement", label: "Fiche de positionnement" },
  { key: "progression_pedagogique", label: "Progression pédagogique" },
  { key: "supports_moodle", label: "Supports déposés sur Moodle" },
  { key: "sujets_grilles_moodle", label: "Sujets et grilles déposés sur Moodle" },
  { key: "notes_hyperplanning", label: "Notes saisies dans Hyperplanning" },
];

export interface InvoiceContext {
  module: {
    name: string;
    ycode: string | null;
    year: number;
    total_hours: number;
    hourly_rate: number | null;
    purchase_order_ref: string | null;
    iceberg_state: IcebergState;
    admin_docs: Record<string, boolean>;
    end_date: string | null;
    first_session_date: string | null;
  };
  notes: Pick<NoteProgress, "satisfied" | "enteredTotal"> & { requiredTotal: number };
  profile: {
    legal_name: string;
    address: string | null;
    siret: string | null;
    vat_number: string | null;
    vat_exempt: boolean;
    hourly_rate: number | null;
    bank_details: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  school: {
    name: string;
    siret: string | null;
    address: string | null;
    billing_email: string | null;
    pa_identifier: string | null;
  } | null;
}

/** Conditions de processus bloquantes (trame, notes, documents administratifs). */
export function invoiceBlockers(ctx: InvoiceContext): string[] {
  const reasons: string[] = [];
  if (!isOutlineSent(ctx.module.iceberg_state)) {
    reasons.push("La trame pédagogique n’a pas été envoyée.");
  }
  if (!ctx.notes.satisfied) {
    reasons.push(
      `Nombre de notes insuffisant (${ctx.notes.enteredTotal}/${ctx.notes.requiredTotal} requises).`,
    );
  }
  for (const doc of REQUIRED_ADMIN_DOCS) {
    if (!ctx.module.admin_docs[doc.key]) reasons.push(`Document manquant : ${doc.label}.`);
  }
  return reasons;
}

/** Valide un IBAN (longueur pays non vérifiée, contrôle modulo 97). */
export function isValidIban(iban: string): boolean {
  const s = iban.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  const rearranged = s.slice(4) + s.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const v = ch >= "A" ? String(ch.charCodeAt(0) - 55) : ch;
    for (const d of v) remainder = (remainder * 10 + Number(d)) % 97;
  }
  return remainder === 1;
}

/** Extrait le premier IBAN valide d'un texte libre (RIB), sans espaces. */
export function extractIban(text: string | null): string | null {
  if (!text) return null;
  const candidates = text.match(/[A-Za-z]{2}\d{2}(?:[ ]?[A-Za-z0-9]){11,30}/g) ?? [];
  for (const c of candidates) {
    const s = c.replace(/\s/g, "").toUpperCase();
    // Le texte libre peut coller un BIC après l'IBAN : on teste des préfixes décroissants.
    for (let len = Math.min(s.length, 34); len >= 15; len--) {
      if (isValidIban(s.slice(0, len))) return s.slice(0, len);
    }
  }
  return null;
}

/** Tarif horaire retenu : surcharge du module, sinon celui du profil. */
export function effectiveRate(ctx: InvoiceContext): number | null {
  return ctx.module.hourly_rate ?? ctx.profile?.hourly_rate ?? null;
}

/** Informations manquantes pour émettre une facture conforme (mentions obligatoires). */
export function missingInvoiceData(ctx: InvoiceContext): string[] {
  const missing: string[] = [];
  const p = ctx.profile;
  if (!p) {
    missing.push("Profil prestataire non renseigné (Réglages).");
  } else {
    if (!p.legal_name) missing.push("Nom / raison sociale du prestataire.");
    if (!p.address) missing.push("Adresse du prestataire.");
    if (!p.siret) missing.push("SIRET du prestataire.");
    if (!p.vat_exempt && !p.vat_number)
      missing.push("N° de TVA du prestataire (ou cocher l’art. 293 B).");
    if (!extractIban(p.bank_details)) missing.push("IBAN valide dans le RIB du prestataire.");
  }
  if (effectiveRate(ctx) === null) missing.push("Tarif horaire (profil ou module).");
  if (!ctx.module.total_hours || ctx.module.total_hours <= 0)
    missing.push("Nombre d’heures du module.");
  if (!ctx.module.ycode) missing.push("YCODE du module.");
  if (!ctx.module.purchase_order_ref) missing.push("Référence de bon de commande du module.");
  const s = ctx.school;
  if (!s) {
    missing.push("École du module non renseignée.");
  } else {
    if (!s.siret) missing.push("SIRET de l’école.");
    if (!s.address) missing.push("Adresse de l’école.");
    if (!s.billing_email) missing.push("E-mail de facturation de l’école.");
  }
  return missing;
}

export interface InvoiceAmounts {
  amountExVat: number;
  vatRate: number;
  vatAmount: number;
  amountIncVat: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeAmounts(input: {
  hours: number;
  unitPriceExVat: number;
  vatExempt: boolean;
}): InvoiceAmounts {
  const amountExVat = round2(input.hours * input.unitPriceExVat);
  const vatRate = input.vatExempt ? 0 : VAT_RATE;
  const vatAmount = round2((amountExVat * vatRate) / 100);
  return { amountExVat, vatRate, vatAmount, amountIncVat: round2(amountExVat + vatAmount) };
}

/** Échéance « 30 jours fin de mois » : émission + 30 j, puis dernier jour de ce mois. */
export function computeDueDate(issuedOn: string): string {
  const d = new Date(`${issuedOn}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 30);
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return end.toISOString().slice(0, 10);
}

/** Numéro séquentiel `AAAA-NNN` : max existant de l'année + 1 (jamais de trou réutilisé). */
export function nextInvoiceNumber(year: number, existing: string[]): string {
  const prefix = `${year}-`;
  const max = existing
    .filter((n) => n.startsWith(prefix))
    .map((n) => Number(n.slice(prefix.length)))
    .filter((n) => Number.isInteger(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function invoiceDesignation(
  m: { name: string; ycode: string | null },
  hours: number,
): string {
  return `Prestation d’enseignement – Module ${m.name}${m.ycode ? ` (YCODE : ${m.ycode})` : ""} – ${hours} heures`;
}

export interface InvoiceSnapshot {
  number: string;
  issuedOn: string;
  dueOn: string;
  currency: "EUR";
  seller: {
    name: string;
    address: string;
    siret: string;
    vatNumber: string | null;
    vatExempt: boolean;
    email: string | null;
    phone: string | null;
    iban: string;
    bankDetails: string;
  };
  buyer: {
    name: string;
    siret: string;
    address: string;
    billingEmail: string;
    paIdentifier: string | null;
  };
  purchaseOrderRef: string;
  moduleName: string;
  ycode: string;
  line: { designation: string; hours: number; unitPriceExVat: number; deliveredOn: string | null };
  amounts: InvoiceAmounts;
  paymentTerms: string;
  exemptionMention: string | null;
}

/** Construit l'instantané figé de la facture. Suppose `missingInvoiceData` vide. */
export function buildInvoiceSnapshot(
  ctx: InvoiceContext,
  opts: { number: string; issuedOn: string },
): InvoiceSnapshot {
  const p = ctx.profile!;
  const s = ctx.school!;
  const unitPrice = effectiveRate(ctx)!;
  const hours = ctx.module.total_hours;
  const amounts = computeAmounts({ hours, unitPriceExVat: unitPrice, vatExempt: p.vat_exempt });

  return {
    number: opts.number,
    issuedOn: opts.issuedOn,
    dueOn: computeDueDate(opts.issuedOn),
    currency: "EUR",
    seller: {
      name: p.legal_name,
      address: p.address!,
      siret: p.siret!.replace(/\s/g, ""),
      vatNumber: p.vat_number,
      vatExempt: p.vat_exempt,
      email: p.email,
      phone: p.phone,
      iban: extractIban(p.bank_details)!,
      bankDetails: p.bank_details!,
    },
    buyer: {
      name: s.name,
      siret: s.siret!.replace(/\s/g, ""),
      address: s.address!,
      billingEmail: s.billing_email!,
      paIdentifier: s.pa_identifier,
    },
    purchaseOrderRef: ctx.module.purchase_order_ref!,
    moduleName: ctx.module.name,
    ycode: ctx.module.ycode!,
    line: {
      designation: invoiceDesignation(ctx.module, hours),
      hours,
      unitPriceExVat: unitPrice,
      deliveredOn: ctx.module.end_date,
    },
    amounts,
    paymentTerms: "Paiement à 30 jours fin de mois, par virement",
    exemptionMention: p.vat_exempt ? VAT_EXEMPT_MENTION : null,
  };
}
