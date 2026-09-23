import { moduleNoteProgress } from "@/lib/assessments/queries";
import { getModule, listModules, type ModuleWithSchool } from "@/lib/modules/queries";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/settings/queries";
import { invoiceBlockers, missingInvoiceData, type InvoiceContext } from "@/lib/ynov/invoice";
import type { Tables } from "@/types/db";

/** Rassemble tout ce qu'il faut pour évaluer/émettre la facture d'un module. */
export async function loadInvoiceContext(moduleId: string): Promise<InvoiceContext | null> {
  const mod = await getModule(moduleId);
  if (!mod) return null;

  const supabase = await createClient();
  const [profile, notes, schoolRes] = await Promise.all([
    getProfile(),
    moduleNoteProgress(moduleId, mod.total_hours),
    mod.school_id
      ? supabase.from("school").select("*").eq("id", mod.school_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    module: {
      name: mod.name,
      ycode: mod.ycode,
      year: mod.year,
      total_hours: mod.total_hours,
      hourly_rate: mod.hourly_rate,
      purchase_order_ref: mod.purchase_order_ref,
      iceberg_state: mod.iceberg_state,
      admin_docs: (mod.admin_docs as Record<string, boolean>) ?? {},
      end_date: mod.end_date,
      first_session_date: mod.first_session_date,
    },
    notes: {
      satisfied: notes.satisfied,
      enteredTotal: notes.enteredTotal,
      requiredTotal: notes.requirement.total,
    },
    profile,
    school: schoolRes.data,
  };
}

export async function getInvoiceByModule(moduleId: string): Promise<Tables<"invoice"> | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoice")
    .select("*")
    .eq("module_id", moduleId)
    .maybeSingle();
  return data;
}

export async function getInvoice(id: string): Promise<Tables<"invoice"> | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("invoice").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function listInvoiceNumbers(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("invoice").select("number");
  return (data ?? []).map((r) => r.number);
}

export type BillingRow =
  | { kind: "invoiced"; module: ModuleWithSchool; invoice: Tables<"invoice"> }
  | { kind: "ready"; module: ModuleWithSchool }
  | { kind: "blocked"; module: ModuleWithSchool; reasons: number };

/** Vue d'ensemble : pour chaque module, facturé / prêt à facturer / bloqué (nb de raisons). */
export async function listBillingOverview(): Promise<BillingRow[]> {
  const supabase = await createClient();
  const [modules, { data: invoices }] = await Promise.all([
    listModules(),
    supabase.from("invoice").select("*"),
  ]);
  const byModule = new Map((invoices ?? []).map((i) => [i.module_id, i]));

  return Promise.all(
    modules.map(async (m): Promise<BillingRow> => {
      const invoice = byModule.get(m.id);
      if (invoice) return { kind: "invoiced", module: m, invoice };
      const ctx = await loadInvoiceContext(m.id);
      const reasons = ctx ? invoiceBlockers(ctx).length + missingInvoiceData(ctx).length : 1;
      return reasons === 0 ? { kind: "ready", module: m } : { kind: "blocked", module: m, reasons };
    }),
  );
}
