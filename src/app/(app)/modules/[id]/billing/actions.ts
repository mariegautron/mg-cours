"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";

import { serverEnv } from "@/lib/env";
import { buildFacturX } from "@/lib/invoice/facturx";
import { getInvoiceByModule, listInvoiceNumbers, loadInvoiceContext } from "@/lib/invoice/queries";
import { advanceModule } from "@/lib/modules/advance";
import { EMAIL_NOT_ENABLED, failure, NOT_FOUND } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
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
  if (!ctx) return { error: NOT_FOUND.module };

  if (await getInvoiceByModule(moduleId))
    return { error: "Une facture existe déjà pour ce module." };

  const reasons = [...invoiceBlockers(ctx), ...missingInvoiceData(ctx)];
  if (reasons.length > 0) {
    return { error: "On n’a pas pu créer la facture : il reste des points à traiter.", reasons };
  }

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
    if (error.code !== "23505") {
      console.error("[facture] enregistrement impossible", error);
      return { error: failure("enregistrer la facture") };
    }
    if (error.message.includes("invoice_module_uidx")) {
      return { error: "Une facture existe déjà pour ce module." };
    }
  }
  return { error: failure("numéroter la facture") };
}

/** Envoie la facture Factur-X à l'e-mail de facturation de l'école (un seul fichier joint). */
export async function sendInvoiceByEmail(moduleId: string): Promise<BillingActionState> {
  const { RESEND_API_KEY, RESEND_FROM } = serverEnv();
  if (!RESEND_API_KEY || !RESEND_FROM) {
    // La cause technique va dans les journaux du serveur, pas dans l'interface.
    console.error("[e-mail] envoi désactivé : RESEND_API_KEY ou RESEND_FROM manquant");
    return { error: EMAIL_NOT_ENABLED };
  }

  const invoice = await getInvoiceByModule(moduleId);
  if (!invoice?.snapshot) return { error: NOT_FOUND.invoice };
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
  if (error) {
    console.error("[e-mail] échec de l’envoi de la facture", error);
    return {
      error:
        "On n’a pas pu envoyer l’e-mail : la facture n’est pas marquée comme envoyée. Réessaie dans un instant, ou télécharge le PDF et envoie-le toi-même.",
    };
  }

  return markSent(moduleId, invoice.id);
}

async function markSent(moduleId: string, invoiceId: string): Promise<BillingActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoice")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", invoiceId);
  if (error) return { error: failure("enregistrer la facture comme envoyée") };
  await advanceModule(moduleId, "invoice_sent");
  refresh(moduleId);
  return { ok: true };
}

/** Marque envoyée sans e-mail (dépôt manuel sur la Plateforme Agréée). */
export async function markInvoiceSent(moduleId: string): Promise<BillingActionState> {
  const invoice = await getInvoiceByModule(moduleId);
  if (!invoice) return { error: NOT_FOUND.invoice };
  if (invoice.status !== "ready") return { error: "Cette facture a déjà été envoyée." };
  return markSent(moduleId, invoice.id);
}

export async function markInvoicePaid(moduleId: string): Promise<BillingActionState> {
  const invoice = await getInvoiceByModule(moduleId);
  if (!invoice) return { error: NOT_FOUND.invoice };
  if (invoice.status !== "sent") return { error: "La facture doit d’abord être envoyée." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("invoice")
    .update({ status: "paid", paid_on: new Date().toISOString().slice(0, 10) })
    .eq("id", invoice.id);
  if (error) return { error: failure("enregistrer la facture comme payée") };
  await advanceModule(moduleId, "paid");
  refresh(moduleId);
  return { ok: true };
}

/**
 * Facture faite hors de l'application : le PDF a été déposé sur le module, on passe le module
 * à l'état final « payée » (plus d'alerte ni de ligne « à facturer »).
 */
export async function markExternalInvoicePaid(moduleId: string): Promise<BillingActionState> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("module_document")
    .select("id", { count: "exact", head: true })
    .eq("module_id", moduleId)
    .eq("kind", "external_invoice");
  if (!count) return { error: "Dépose d’abord le PDF de la facture." };

  await advanceModule(moduleId, "paid");
  refresh(moduleId);
  return { ok: true };
}

/** Supprime une facture non envoyée (une facture envoyée est définitive). */
export async function deleteInvoice(moduleId: string): Promise<BillingActionState> {
  const invoice = await getInvoiceByModule(moduleId);
  if (!invoice) return { error: NOT_FOUND.invoice };
  if (invoice.status !== "ready") {
    return { error: "Une facture envoyée ne peut pas être supprimée." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("invoice").delete().eq("id", invoice.id);
  if (error) return { error: failure("supprimer la facture") };
  refresh(moduleId);
  return { ok: true };
}
