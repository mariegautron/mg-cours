"use client";

import { useState, useTransition, type ReactNode } from "react";
import { CircleCheck, CircleDashed, Hourglass, Upload } from "lucide-react";

import { ActionError } from "@/components/action-error";
import { setInvoiceStep, type BillingActionState } from "@/app/(app)/modules/[id]/billing/actions";
import Link from "next/link";

import { Pill } from "@/components/dashboard/pill";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  dateNote,
  SIMPLE_STATUS_LABELS,
  type InvoiceBox,
  type SimpleInvoiceStatus,
} from "@/lib/invoice/simple";

const STATUS_ICON: Record<SimpleInvoiceStatus, typeof Upload> = {
  to_deposit: Upload,
  to_send: CircleDashed,
  sent: Hourglass,
  paid: CircleCheck,
};

/**
 * Facturation simple (US-150) : le dépôt de ta facture (passé en `children`) et deux cases,
 * « Envoyée » et « Payée », avec leur date. Chaque case s'enregistre toute seule.
 */
export function SimpleInvoice({
  moduleId,
  status,
  sent,
  paid,
  sentOn,
  paidOn,
  datesAvailable,
  today,
  summary,
  title,
  subtitle,
  href,
  hasFile,
  children,
}: {
  moduleId: string;
  status: SimpleInvoiceStatus;
  sent: boolean;
  paid: boolean;
  sentOn: string | null;
  paidOn: string | null;
  datesAvailable: boolean;
  today: string;
  /** Résumé d'une ligne (montant, école…), s'il y en a un. */
  summary?: string | null;
  /** Vue « tous les modules » : le bloc porte le nom du module (lien vers sa facturation). */
  title?: string;
  subtitle?: string;
  href?: string;
  /** Un PDF de facture est déposé (sinon « Payée · PDF manquant »). */
  hasFile?: boolean;
  children: ReactNode;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<BillingActionState | null>(null);
  const [dates, setDates] = useState({ sent: sentOn ?? today, paid: paidOn ?? today });

  // Les cases se cochent tout de suite (l'enregistrement suit) : plus d'attente de 5 s.
  const [boxes, setBoxes] = useState({ sent, paid });
  const [saved, setSaved] = useState(false);
  // Badge d'après les cases telles qu'affichées (décocher « Payée » le change tout de suite).
  const shownStatus: SimpleInvoiceStatus = boxes.paid
    ? "paid"
    : boxes.sent
      ? "sent"
      : status === "paid" || status === "sent"
        ? hasFile === false
          ? "to_deposit"
          : "to_send"
        : status;
  const Icon = STATUS_ICON[shownStatus];
  const toggle = (box: InvoiceBox, checked: boolean) => {
    setBoxes((b) =>
      box === "sent"
        ? { sent: checked, paid: checked ? b.paid : false }
        : { sent: checked ? true : b.sent, paid: checked },
    );
    setSaved(false);
    start(async () => {
      const res = await setInvoiceStep(moduleId, box, checked, dates[box]);
      setState(res);
      if (res?.error) setBoxes({ sent, paid });
      else setSaved(true);
    });
  };

  return (
    <section
      aria-labelledby={`simple-invoice-${moduleId}`}
      className="bg-card space-y-4 rounded-xl border p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id={`simple-invoice-${moduleId}`} className="text-sm font-semibold">
            {title && href ? (
              <Link href={href} className="underline-offset-2 hover:underline">
                {title}
              </Link>
            ) : (
              (title ?? "Ma facture")
            )}
          </h2>
          {subtitle ? <p className="text-muted-foreground text-sm">{subtitle}</p> : null}
        </div>
        <p role="status">
          <Pill
            tone={shownStatus === "paid" ? "ok" : shownStatus === "to_deposit" ? "warn" : "wip"}
          >
            <Icon aria-hidden className="size-3.5" />
            {shownStatus === "to_deposit"
              ? "Pas de facture déposée"
              : shownStatus === "paid" && hasFile === false
                ? "Payée · PDF manquant"
                : SIMPLE_STATUS_LABELS[shownStatus]}
          </Pill>
        </p>
      </div>
      {title ? null : (
        <p className="text-muted-foreground text-sm">
          Tu fais ta facture toi-même. Ici, tu la déposes et tu suis où elle en est. Chaque case
          s’enregistre toute seule.
          {summary ? ` ${summary}` : ""}
        </p>
      )}

      {children}

      <fieldset className="space-y-3">
        <legend className="sr-only">Où en est ta facture</legend>
        {(
          [
            { box: "sent", label: "Envoyée à l’école", checked: boxes.sent, date: sentOn },
            { box: "paid", label: "Payée", checked: boxes.paid, date: paidOn },
          ] as const
        ).map(({ box, label, checked, date }) => (
          <div key={box} className="flex flex-wrap items-center gap-3">
            <label className="flex min-h-11 items-center gap-2 font-medium">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => toggle(box, e.target.checked)}
                className="accent-primary size-5"
              />
              {label}
            </label>
            {datesAvailable ? (
              checked ? (
                <span className="text-muted-foreground text-sm">
                  {dateNote(box === "sent" ? "envoyée" : "payée", date)}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Label
                    htmlFor={`invoice-${moduleId}-${box}-date`}
                    className="text-muted-foreground text-sm"
                  >
                    Date
                  </Label>
                  <Input
                    id={`invoice-${moduleId}-${box}-date`}
                    type="date"
                    value={dates[box]}
                    onChange={(e) => setDates((d) => ({ ...d, [box]: e.target.value }))}
                    className="w-auto"
                  />
                </span>
              )
            ) : null}
          </div>
        ))}
        {boxes.paid && hasFile === false ? (
          <p className="text-sun text-sm font-semibold">
            Aucune facture déposée : dépose le PDF pour la retrouver.
          </p>
        ) : null}
        <p role="status" className="text-muted-foreground min-h-5 text-sm">
          {pending ? "Enregistrement…" : saved ? "Enregistré." : ""}
        </p>
      </fieldset>
      {state?.error ? <ActionError error={state.error} /> : null}
    </section>
  );
}
