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

export const metadata: Metadata = { title: "Facturation" };

const DETAIL_LIMIT = 12;

const KPI: { status: SimpleInvoiceStatus; label: string }[] = [
  { status: "to_deposit", label: "À déposer" },
  { status: "to_send", label: "À envoyer" },
  { status: "sent", label: "En attente de paiement" },
  { status: "paid", label: "Payées" },
];

/**
 * Facturation de tous les modules (maquette « FacSimple ») : chaque module porte le dépôt de sa
 * facture et deux cases, « Envoyée à l'école » et « Payée » ; le même bloc est en bas de la fiche
 * du module. Chaque case s'enregistre toute seule.
 */
export default async function BillingPage() {
  const [rows, withFile] = await Promise.all([listBillingOverview(), listModulesWithInvoiceFile()]);
  const today = todayInParis();
  const statusOf = (r: (typeof rows)[number]) =>
    simpleInvoiceStatus({ hasFile: withFile.has(r.module.id), state: r.module.iceberg_state });
  const count = (status: SimpleInvoiceStatus) => rows.filter((r) => statusOf(r) === status).length;
  // Les blocs détaillés (dépôt + cases) : les factures à suivre d'abord, au plus 12 ; les autres
  // restent un clic plus loin, sur la facturation de leur module.
  const ordered = [...rows].sort(
    (a, b) => Number(statusOf(a) === "paid") - Number(statusOf(b) === "paid"),
  );
  const shown = ordered.slice(0, DETAIL_LIMIT);
  const rest = ordered.slice(DETAIL_LIMIT);
  const details = await Promise.all(
    shown.map(async (r) => {
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
        <h1 className="text-3xl font-semibold">Facturation</h1>
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
          <ul className="space-y-4">
            {details.map(({ row: r, invoiceDocs, tracking, status }) => (
              <li key={r.module.id} className="space-y-1">
                <SimpleInvoice
                  moduleId={r.module.id}
                  title={r.module.name}
                  href={`/modules/${r.module.id}/billing`}
                  subtitle={`${r.module.school?.name ?? "École non renseignée"} · ${schoolYearOf(r.module.year)} · ${r.module.total_hours} h`}
                  status={status}
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
                <div className="px-2 text-sm">
                  <p className="font-medium">{r.next.label}</p>
                  {r.kind === "blocked" ? (
                    <ul className="text-muted-foreground list-disc pl-5">
                      {r.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {rest.length > 0 ? (
            <section aria-labelledby="others" className="space-y-2">
              <h2 id="others" className="text-lg font-semibold">
                Autres modules ({rest.length})
              </h2>
              <ul className="divide-y rounded-xl border text-sm">
                {rest.map((r) => (
                  <li key={r.module.id}>
                    <Link
                      href={`/modules/${r.module.id}/billing`}
                      className="hover:bg-accent flex flex-wrap items-center justify-between gap-2 p-3"
                    >
                      <span>
                        {r.module.name}{" "}
                        <span className="text-muted-foreground text-sm">
                          · {schoolYearOf(r.module.year)}
                        </span>
                      </span>
                      <Pill tone={statusOf(r) === "paid" ? "ok" : "wip"}>
                        {SIMPLE_STATUS_LABELS[statusOf(r)]}
                      </Pill>
                    </Link>
                    <div className="px-3 pb-3">
                      <p className="font-medium">{r.next.label}</p>
                      {r.kind === "blocked" ? (
                        <ul className="text-muted-foreground list-disc pl-5">
                          {r.reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <p className="text-muted-foreground text-sm">
            Le même bloc apparaît en bas de la fiche de chaque module.
          </p>
        </>
      )}
    </div>
  );
}
