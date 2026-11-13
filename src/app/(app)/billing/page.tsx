import { schoolYearOf } from "@/lib/modules/list-state";
import type { Metadata } from "next";
import Link from "next/link";

import { Pill } from "@/components/dashboard/pill";

import { SimpleInvoice } from "@/components/billing/simple-invoice";
import { EmptyState } from "@/components/empty-state";
import { DocumentSlot } from "@/components/modules/module-documents";
import { getInvoiceTracking, listModulesWithInvoiceFile } from "@/lib/invoice/tracking-queries";
import { listBillingOverview } from "@/lib/invoice/queries";
import {
  isPaid,
  isSent,
  SIMPLE_STATUS_LABELS,
  simpleInvoiceStatus,
  type SimpleInvoiceStatus,
} from "@/lib/invoice/simple";
import { todayInParis } from "@/lib/modules/next-session";
import { getModuleDocuments } from "@/lib/modules/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Facturation" };

const KPI: { status: SimpleInvoiceStatus; label: string }[] = [
  { status: "to_deposit", label: "À déposer" },
  { status: "to_send", label: "À envoyer" },
  { status: "sent", label: "En attente de paiement" },
  { status: "paid", label: "Payées" },
];

/**
 * Facturation de tous les modules (maquette « FacSimple ») : les modules aux cours faits (ou dont une
 * facture est déposée), la dernière séance la plus ancienne d'abord, chacun replié sur une ligne ;
 * dépliée, la ligne porte le dépôt de la facture et les cases « Envoyée » / « Payée ».
 */
export default async function BillingPage({ searchParams }: PageProps<"/billing">) {
  const all = (await searchParams).tous === "1";
  const supabase = await createClient();
  const [rows, withFile, { data: courses }] = await Promise.all([
    listBillingOverview(),
    listModulesWithInvoiceFile(),
    supabase.from("course").select("module_id, session_date, completion"),
  ]);
  const today = todayInParis();
  const statusOf = (r: (typeof rows)[number]) =>
    simpleInvoiceStatus({ hasFile: withFile.has(r.module.id), state: r.module.iceberg_state });
  const count = (status: SimpleInvoiceStatus) => rows.filter((r) => statusOf(r) === status).length;
  // Cours faits et date de la dernière séance, par module.
  const perModule = new Map<string, { total: number; done: number; last: string }>();
  for (const c of courses ?? []) {
    const cur = perModule.get(c.module_id) ?? { total: 0, done: 0, last: "" };
    cur.total += 1;
    if (c.completion === "done" || c.completion === "partial") cur.done += 1;
    if (c.session_date && c.session_date > cur.last) cur.last = c.session_date;
    perModule.set(c.module_id, cur);
  }
  const coursesDone = (id: string) => {
    const p = perModule.get(id);
    return !!p && p.total > 0 && p.done === p.total;
  };
  const listed = rows
    .filter((r) => all || coursesDone(r.module.id) || withFile.has(r.module.id))
    .sort((a, b) =>
      (perModule.get(a.module.id)?.last || "9999").localeCompare(
        perModule.get(b.module.id)?.last || "9999",
      ),
    );
  const details = await Promise.all(
    listed.map(async (r) => {
      const [documents, tracking] = await Promise.all([
        getModuleDocuments(r.module.id),
        getInvoiceTracking(r.module.id),
      ]);
      return {
        row: r,
        invoiceDocs: documents.filter((d) => d.kind === "external_invoice"),
        tracking,
        status: statusOf(r),
      };
    }),
  );

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1>Facturation</h1>
        <p className="text-muted-foreground">
          Tu fais ta facture toi-même. Ici, tu la déposes et tu suis où elle en est. Chaque case
          s’enregistre toute seule.
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Rien à facturer"
          description="Un module apparaît ici dès qu’il est terminé."
          actions={[{ label: "Voir mes modules", href: "/modules" }]}
        />
      ) : (
        <>
          <ul
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Où en sont les factures"
          >
            {KPI.map((k) => (
              <li key={k.status} className="bg-card rounded-xl border p-4">
                <span className="text-muted-foreground text-sm">{k.label}</span>
                <strong className="font-heading block text-3xl">{count(k.status)}</strong>
              </li>
            ))}
          </ul>
          <p className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {all
                ? "Tous les modules."
                : "Modules aux cours faits, ou dont la facture est déposée."}
            </span>
            <Link
              href={all ? "/billing" : "/billing?tous=1"}
              className="font-semibold underline underline-offset-2"
            >
              {all ? "Seulement ceux à facturer" : "Tous les modules"}
            </Link>
          </p>
          {details.length === 0 ? (
            <EmptyState
              compact
              title="Rien à facturer pour l’instant"
              description="Un module apparaît ici quand toutes ses séances sont faites."
            />
          ) : (
            <ul className="divide-y rounded-xl border">
              {details.map(({ row: r, invoiceDocs, tracking, status }) => (
                <li key={r.module.id}>
                  <details>
                    <summary className="hover:bg-accent flex min-h-12 cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                      <strong>{r.module.name}</strong>
                      <span className="text-muted-foreground text-sm">
                        {r.module.school?.name ?? "École non renseignée"} ·{" "}
                        {schoolYearOf(r.module.year)} · {r.module.total_hours} h
                      </span>
                      <Pill
                        tone={status === "paid" ? "ok" : status === "to_deposit" ? "warn" : "wip"}
                      >
                        {status === "paid" && invoiceDocs.length === 0
                          ? "Payée · PDF manquant"
                          : SIMPLE_STATUS_LABELS[status]}
                      </Pill>
                      <span className="text-primary ml-auto text-sm font-semibold">Ouvrir</span>
                    </summary>
                    <div className="p-3">
                      <SimpleInvoice
                        moduleId={r.module.id}
                        title={r.module.name}
                        href={`/modules/${r.module.id}/billing`}
                        status={status}
                        hasFile={invoiceDocs.length > 0}
                        sent={isSent(r.module.iceberg_state)}
                        paid={isPaid(r.module.iceberg_state)}
                        sentOn={tracking.sentOn}
                        paidOn={tracking.paidOn}
                        datesAvailable={tracking.available}
                        today={today}
                      >
                        <DocumentSlot
                          moduleId={r.module.id}
                          kind="external_invoice"
                          title="Ma facture (PDF)"
                          hint="Dépose ici le PDF de ta facture."
                          documents={invoiceDocs}
                        />
                      </SimpleInvoice>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
