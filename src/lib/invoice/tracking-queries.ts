import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface InvoiceTracking {
  /** La table des dates existe : sinon on n'affiche ni ne demande de date. */
  available: boolean;
  sentOn: string | null;
  paidOn: string | null;
}

const NONE: InvoiceTracking = { available: false, sentOn: null, paidOn: null };

/** Dates « envoyée le » / « payée le » d'un module. Protégé : table absente → pas de dates. */
export async function getInvoiceTracking(moduleId: string): Promise<InvoiceTracking> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("invoice_tracking")
      .select("sent_on, paid_on")
      .eq("module_id", moduleId)
      .maybeSingle();
    if (error) return NONE;
    return { available: true, sentOn: data?.sent_on ?? null, paidOn: data?.paid_on ?? null };
  } catch {
    return NONE;
  }
}

/** Modules qui ont une facture déposée (module_document `external_invoice`). */
export async function listModulesWithInvoiceFile(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("module_document")
    .select("module_id")
    .eq("kind", "external_invoice");
  return new Set((data ?? []).map((d) => d.module_id));
}
