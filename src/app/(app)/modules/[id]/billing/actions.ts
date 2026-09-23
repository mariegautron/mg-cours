"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";

import { serverEnv } from "@/lib/env";
import { buildFacturX } from "@/lib/invoice/facturx";
import { getInvoiceByModule, listInvoiceNumbers, loadInvoiceContext } from "@/lib/invoice/queries";
import { createClient } from "@/lib/supabase/server";
import { advanceTo, type IcebergState } from "@/lib/ynov/iceberg";
import {
  buildInvoiceSnapshot,
  invoiceBlockers,
  missingInvoiceData,
  nextInvoiceNumber,
  type InvoiceSnapshot,
} from "@/lib/ynov/invoice";

export interface BillingActionState {
  error?: string;
  reasons?: string[];
  ok?: boolean;
}

async function advanceModule(moduleId: string, target: IcebergState) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("module")
    .select("iceberg_state")
    .eq("id", moduleId)
    .single();
  if (!data) return;
  const next = advanceTo(data.iceberg_state, target);
  if (next !== data.iceberg_state) {
    await supabase.from("module").update({ iceberg_state: next }).eq("id", moduleId);
  }
}

function refresh(moduleId: string) {
  revalidatePath(`/modules/${moduleId}/billing`);
  revalidatePath(`/modules/${moduleId}`);
  revalidatePath("/billing");
  revalidatePath("/dashboard");
}

/**
 * Émet la facture. Toutes les conditions sont revérifiées côté serveur (l'UI n'est
 * qu'un confort) : blocages de processus + mentions obligatoires + XML Factur-X valide.
 */
export async function generateInvoice(moduleId: string): Promise<BillingActionState> {
  const ctx = await loadInvoiceContext(moduleId);
  if (!ctx) return { error: "Module introuvable." };

  if (await getInvoiceByModule(moduleId))
    return { error: "Une facture existe déjà pour ce module." };

  const reasons = [...invoiceBlockers(ctx), ...missingInvoiceData(ctx)];
  if (reasons.length > 0) return { error: "Impossible de générer la facture.", reasons };

  const supabase = await createClient();
  const issuedOn = new Date().toISOString().slice(0, 10);
  const year = Number(issuedOn.slice(0, 4));

  // Numérotation séquentielle : en cas de course (contrainte unique), on relit et on retente.
  for (let attempt = 0; attempt < 3; attempt++) {
    const number = nextInvoiceNumber(year, await listInvoiceNumbers());
    const snapshot: InvoiceSnapshot = buildInvoiceSnapshot(ctx, { number, issuedOn });

    try {
      await buildFacturX(snapshot); // valide XSD + Schematron avant d'enregistrer quoi que ce soit
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Facture Factur-X invalide." };
    }

    const { error } = await supabase.from("invoice").insert({
      module_id: moduleId,
      number,
      status: "ready",
      issued_on: issuedOn,
      due_on: snapshot.dueOn,
      purchase_order_ref: snapshot.purchaseOrderRef,
      hours: snapshot.line.hours,
      unit_price_ex_vat: snapshot.line.unitPriceExVat,
      amount_ex_vat: snapshot.amounts.amountExVat,
      vat_rate: snapshot.amounts.vatRate,
      vat_amount: snapshot.amounts.vatAmount,
      amount_inc_vat: snapshot.amounts.amountIncVat,
      recipient_email: snapshot.buyer.billingEmail,
      snapshot: JSON.parse(JSON.stringify(snapshot)),
    });

    if (!error) {
      await advanceModule(moduleId, "invoice_ready");
      refresh(moduleId);
      return { ok: true };
    }
    if (error.code !== "23505") return { error: "Enregistrement impossible. Réessayez." };
    if (error.message.includes("invoice_module_uidx")) {
      return { error: "Une facture existe déjà pour ce module." };
    }
  }
  return { error: "Numérotation impossible. Réessayez." };
}

/** Envoie la facture Factur-X à l'e-mail de facturation de l'école (un seul fichier joint). */
export async function sendInvoiceByEmail(moduleId: string): Promise<BillingActionState> {
  const { RESEND_API_KEY, RESEND_FROM } = serverEnv();
  if (!RESEND_API_KEY || !RESEND_FROM) {
    return { error: "Envoi d’e-mails non configuré (RESEND_API_KEY / RESEND_FROM)." };
  }

  const invoice = await getInvoiceByModule(moduleId);
  if (!invoice?.snapshot) return { error: "Facture introuvable." };
  if (invoice.status === "sent" || invoice.status === "paid") {
    return { error: "Cette facture a déjà été envoyée." };
  }

  const snapshot = invoice.snapshot as unknown as InvoiceSnapshot;
  const { pdf } = await buildFacturX(snapshot);

  const resend = new Resend(RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: RESEND_FROM,
    to: [snapshot.buyer.billingEmail],
    subject: `FACTURE – ${snapshot.seller.name} – ${snapshot.number}`,
    text: `Bonjour,\n\nVeuillez trouver ci-joint la facture ${snapshot.number} (${snapshot.line.designation}).\n\nBien cordialement,\n${snapshot.seller.name}`,
    attachments: [{ filename: `facture-${snapshot.number}.pdf`, content: Buffer.from(pdf) }],
  });
  if (error) return { error: "Échec de l’envoi de l’e-mail." };

  return markSent(moduleId, invoice.id);
}

async function markSent(moduleId: string, invoiceId: string): Promise<BillingActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoice")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", invoiceId);
  if (error) return { error: "Enregistrement impossible." };
  await advanceModule(moduleId, "invoice_sent");
  refresh(moduleId);
  return { ok: true };
}

/** Marque envoyée sans e-mail (dépôt manuel sur la Plateforme Agréée). */
export async function markInvoiceSent(moduleId: string): Promise<BillingActionState> {
  const invoice = await getInvoiceByModule(moduleId);
  if (!invoice) return { error: "Facture introuvable." };
  if (invoice.status !== "ready") return { error: "Cette facture a déjà été envoyée." };
  return markSent(moduleId, invoice.id);
}

export async function markInvoicePaid(moduleId: string): Promise<BillingActionState> {
  const invoice = await getInvoiceByModule(moduleId);
  if (!invoice) return { error: "Facture introuvable." };
  if (invoice.status !== "sent") return { error: "La facture doit d’abord être envoyée." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("invoice")
    .update({ status: "paid", paid_on: new Date().toISOString().slice(0, 10) })
    .eq("id", invoice.id);
  if (error) return { error: "Enregistrement impossible." };
  await advanceModule(moduleId, "paid");
  refresh(moduleId);
  return { ok: true };
}

/** Supprime une facture non envoyée (une facture envoyée est définitive). */
export async function deleteInvoice(moduleId: string): Promise<BillingActionState> {
  const invoice = await getInvoiceByModule(moduleId);
  if (!invoice) return { error: "Facture introuvable." };
  if (invoice.status !== "ready") {
    return { error: "Une facture envoyée ne peut pas être supprimée." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("invoice").delete().eq("id", invoice.id);
  if (error) return { error: "Suppression impossible." };
  refresh(moduleId);
  return { ok: true };
}
