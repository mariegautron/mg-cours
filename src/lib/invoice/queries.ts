import { moduleNoteProgress } from "@/lib/assessments/queries";
import { getModule, listModules, type ModuleWithSchool } from "@/lib/modules/queries";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/settings/queries";
import type { InvoiceContext } from "@/lib/ynov/invoice";
import { nextStep, type NextStep } from "@/lib/ynov/next-step";
import type { Tables } from "@/types/db";

/** Rassemble tout ce qu'il faut pour évaluer/émettre la facture d'un module. */
export async function loadInvoiceContext(moduleId: string): Promise<InvoiceContext | null> {
  const mod = await getModule(moduleId);
  if (!mod) return null;
  return buildInvoiceContext(mod, await getProfile());
}

/**
 * Même contexte à partir d'un module et d'un profil déjà chargés : la vue d'ensemble de la
 * facturation en traite plusieurs, le profil et la fiche module ne sont lus qu'une fois.
 */
async function buildInvoiceContext(
  mod: ModuleWithSchool,
  profile: Tables<"teacher_profile"> | null,
  schools?: Map<string, Tables<"school">>,
): Promise<InvoiceContext> {
  const supabase = await createClient();
  const [notes, schoolRes] = await Promise.all([
    moduleNoteProgress(mod.id, mod.total_hours),
    schools
      ? Promise.resolve({ data: mod.school_id ? (schools.get(mod.school_id) ?? null) : null })
      : mod.school_id
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
  | { kind: "invoiced"; module: ModuleWithSchool; invoice: Tables<"invoice">; next: NextStep }
  | { kind: "ready"; module: ModuleWithSchool; next: NextStep }
  | { kind: "blocked"; module: ModuleWithSchool; reasons: string[]; next: NextStep };

/** Vue d'ensemble : pour chaque module, facturé / prêt à facturer / bloqué (raisons détaillées). */
export async function listBillingOverview(): Promise<BillingRow[]> {
  const supabase = await createClient();
  const [modules, { data: invoices }, profile, { data: schoolRows }] = await Promise.all([
    listModules(),
    supabase.from("invoice").select("*"),
    getProfile(),
    supabase.from("school").select("*"),
  ]);
  const schools = new Map((schoolRows ?? []).map((sc) => [sc.id, sc]));
  const byModule = new Map((invoices ?? []).map((i) => [i.module_id, i]));

  return Promise.all(
    modules.map(async (m): Promise<BillingRow> => {
      const invoice = byModule.get(m.id) ?? null;
      const ctx = await buildInvoiceContext(m, profile, schools);
      const next: NextStep = nextStep(ctx, invoice);
      if (invoice) return { kind: "invoiced", module: m, invoice, next };
      return next.reasons.length === 0
        ? { kind: "ready", module: m, next }
        : { kind: "blocked", module: m, reasons: next.reasons, next };
    }),
  );
}
