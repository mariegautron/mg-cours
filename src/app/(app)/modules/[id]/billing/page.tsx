import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleAlert, CircleCheck } from "lucide-react";

import { GenerateInvoiceButton, InvoiceActions } from "@/components/billing/invoice-actions";
import { Badge } from "@/components/ui/badge";
import { getInvoiceByModule, loadInvoiceContext } from "@/lib/invoice/queries";
import { getModule } from "@/lib/modules/queries";
import { invoiceBlockers, missingInvoiceData, REQUIRED_ADMIN_DOCS } from "@/lib/ynov/invoice";

export async function generateMetadata({
  params,
}: PageProps<"/modules/[id]/billing">): Promise<Metadata> {
  const { id } = await params;
  const mod = await getModule(id);
  return { title: mod ? `Facturation — ${mod.name}` : "Facturation" };
}

const eur = (n: number) =>
  `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

const STATUS_LABEL = {
  draft: "Brouillon",
  ready: "À envoyer",
  sent: "Envoyée",
  paid: "Payée",
} as const;

export default async function ModuleBillingPage({ params }: PageProps<"/modules/[id]/billing">) {
  const { id } = await params;
  const [mod, ctx, invoice] = await Promise.all([
    getModule(id),
    loadInvoiceContext(id),
    getInvoiceByModule(id),
  ]);
  if (!mod || !ctx) notFound();

  const blockers = invoiceBlockers(ctx);
  const missing = missingInvoiceData(ctx);
  const canGenerate = blockers.length === 0 && missing.length === 0;

  const conditions = [
    {
      ok: !blockers.includes("La trame pédagogique n’a pas été envoyée."),
      label: "Trame pédagogique envoyée",
    },
    {
      ok: ctx.notes.satisfied,
      label: `Notes saisies (${ctx.notes.enteredTotal}/${ctx.notes.requiredTotal} requises)`,
    },
    ...REQUIRED_ADMIN_DOCS.map((d) => ({ ok: !!ctx.module.admin_docs[d.key], label: d.label })),
  ];

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Facturation — {mod.name}</h1>
        <p className="text-muted-foreground">
          <Link href={`/modules/${id}`} className="underline underline-offset-2">
            Retour au module
          </Link>
        </p>
      </div>

      {invoice ? (
        <section aria-labelledby="invoice" className="space-y-4 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="invoice" className="text-lg font-medium">
              Facture {invoice.number}
            </h2>
            <Badge variant={invoice.status === "paid" ? "secondary" : "outline"}>
              {STATUS_LABEL[invoice.status]}
            </Badge>
          </div>
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <dt className="text-muted-foreground">Émission</dt>
            <dd>{day(invoice.issued_on)}</dd>
            <dt className="text-muted-foreground">Échéance</dt>
            <dd>{invoice.due_on ? day(invoice.due_on) : "—"}</dd>
            <dt className="text-muted-foreground">Référence client</dt>
            <dd>{invoice.purchase_order_ref}</dd>
            <dt className="text-muted-foreground">Total HT</dt>
            <dd>{eur(invoice.amount_ex_vat)}</dd>
            <dt className="text-muted-foreground">TVA ({invoice.vat_rate} %)</dt>
            <dd>{eur(invoice.vat_amount)}</dd>
            <dt className="text-muted-foreground">Total TTC</dt>
            <dd className="font-medium">{eur(invoice.amount_inc_vat)}</dd>
            <dt className="text-muted-foreground">Destinataire</dt>
            <dd>{invoice.recipient_email}</dd>
            {invoice.sent_at ? (
              <>
                <dt className="text-muted-foreground">Envoyée le</dt>
                <dd>{day(invoice.sent_at)}</dd>
              </>
            ) : null}
            {invoice.paid_on ? (
              <>
                <dt className="text-muted-foreground">Payée le</dt>
                <dd>{day(invoice.paid_on)}</dd>
              </>
            ) : null}
          </dl>
          <InvoiceActions moduleId={id} invoiceId={invoice.id} status={invoice.status} />
        </section>
      ) : (
        <>
          <section aria-labelledby="conditions">
            <h2 id="conditions" className="mb-3 text-lg font-medium">
              Conditions YNOV avant facturation
            </h2>
            <ul className="space-y-1 text-sm">
              {conditions.map((c) => (
                <li key={c.label} className="flex items-center gap-2">
                  {c.ok ? (
                    <CircleCheck
                      aria-hidden
                      className="size-4 text-emerald-600 dark:text-emerald-400"
                    />
                  ) : (
                    <CircleAlert aria-hidden className="text-destructive size-4" />
                  )}
                  <span>
                    {c.label}
                    <span className="sr-only">{c.ok ? " : fait" : " : à faire"}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground mt-2 text-sm">
              Documents administratifs : à cocher sur la{" "}
              <Link href={`/modules/${id}`} className="underline underline-offset-2">
                page du module
              </Link>
              .
            </p>
          </section>

          <section aria-labelledby="missing">
            <h2 id="missing" className="mb-3 text-lg font-medium">
              Mentions obligatoires
            </h2>
            {missing.length === 0 ? (
              <p className="text-sm">Toutes les informations requises sont renseignées.</p>
            ) : (
              <>
                <ul className="text-destructive list-inside list-disc text-sm">
                  {missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
                <p className="text-muted-foreground mt-2 text-sm">
                  À compléter dans{" "}
                  <Link href="/settings" className="underline underline-offset-2">
                    Réglages
                  </Link>{" "}
                  (profil, école) ou sur la{" "}
                  <Link href={`/modules/${id}/edit`} className="underline underline-offset-2">
                    fiche du module
                  </Link>
                  .
                </p>
              </>
            )}
          </section>

          <GenerateInvoiceButton moduleId={id} disabled={!canGenerate} />
        </>
      )}
    </div>
  );
}
