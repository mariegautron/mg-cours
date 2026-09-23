"use client";

import { useState, useTransition } from "react";
import { BadgeEuro, Download, FileCheck2, FileCode, Mail, Send, Trash2 } from "lucide-react";

import {
  deleteInvoice,
  generateInvoice,
  markInvoicePaid,
  markInvoiceSent,
  sendInvoiceByEmail,
  type BillingActionState,
} from "@/app/(app)/modules/[id]/billing/actions";
import { Button } from "@/components/ui/button";

export function GenerateInvoiceButton({
  moduleId,
  disabled,
}: {
  moduleId: string;
  disabled: boolean;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<BillingActionState | null>(null);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={disabled || pending}
        onClick={() => start(async () => setState(await generateInvoice(moduleId)))}
      >
        <FileCheck2 aria-hidden />
        {pending ? "Génération…" : "Générer la facture"}
      </Button>
      {state?.error ? (
        <div role="alert" className="text-destructive text-sm">
          <p>{state.error}</p>
          {state.reasons?.length ? (
            <ul className="list-inside list-disc">
              {state.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function InvoiceActions({
  moduleId,
  invoiceId,
  status,
}: {
  moduleId: string;
  invoiceId: string;
  status: "draft" | "ready" | "sent" | "paid";
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<BillingActionState | null>(null);
  const run = (fn: (id: string) => Promise<BillingActionState>) =>
    start(async () => setState(await fn(moduleId)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary">
          <a href={`/api/invoices/${invoiceId}/pdf`}>
            <Download aria-hidden />
            Télécharger le PDF Factur-X
          </a>
        </Button>
        <Button asChild size="sm" variant="secondary">
          <a href={`/api/invoices/${invoiceId}/xml`}>
            <FileCode aria-hidden />
            Télécharger le XML
          </a>
        </Button>
        {status === "ready" ? (
          <>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() => run(sendInvoiceByEmail)}
            >
              <Mail aria-hidden />
              Envoyer par e-mail à l’école
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => run(markInvoiceSent)}
            >
              <Send aria-hidden />
              Marquer comme envoyée
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => run(deleteInvoice)}
            >
              <Trash2 aria-hidden />
              Supprimer la facture
            </Button>
          </>
        ) : null}
        {status === "sent" ? (
          <Button type="button" size="sm" disabled={pending} onClick={() => run(markInvoicePaid)}>
            <BadgeEuro aria-hidden />
            Marquer comme payée
          </Button>
        ) : null}
      </div>
      {state?.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
