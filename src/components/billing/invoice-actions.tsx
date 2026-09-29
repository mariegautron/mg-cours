"use client";

import { useState, useTransition } from "react";
import { BadgeEuro, Ellipsis, ExternalLink, FileCheck2, FileCode, Mail, Send } from "lucide-react";

import {
  deleteInvoice,
  generateInvoice,
  markInvoicePaid,
  markInvoiceSent,
  sendInvoiceByEmail,
  type BillingActionState,
} from "@/app/(app)/modules/[id]/billing/actions";
import { DownloadButton } from "@/components/download-button";
import { PreviewLink } from "@/components/preview-link";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
      <PendingButton
        type="button"
        pending={pending}
        pendingLabel="Génération de la facture…"
        disabled={disabled}
        onClick={() => start(async () => setState(await generateInvoice(moduleId)))}
      >
        <FileCheck2 aria-hidden />
        Générer la facture
      </PendingButton>
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

const eur = (n: number) =>
  `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export function InvoiceActions({
  moduleId,
  invoiceId,
  status,
  number,
  recipientEmail,
  amountIncVat,
}: {
  moduleId: string;
  invoiceId: string;
  status: "draft" | "ready" | "sent" | "paid";
  number: string;
  recipientEmail: string | null;
  amountIncVat: number;
}) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<BillingActionState | null>(null);
  // Action en cours : son bouton affiche l'attente, les autres attendent la fin (pas de doublon).
  const [current, setCurrent] = useState<string | null>(null);
  const run = (key: string, fn: (id: string) => Promise<BillingActionState>) => {
    setCurrent(key);
    start(async () => setState(await fn(moduleId)));
  };
  const busy = (key: string) => pending && current === key;
  const blocked = (key: string) => pending && current !== key;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <DownloadButton
          href={`/api/invoices/${invoiceId}/pdf`}
          doneLabel={`Facture ${number} téléchargée.`}
        >
          Télécharger le PDF Factur-X
        </DownloadButton>
        {status === "ready" ? (
          <>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <PendingButton
                  type="button"
                  size="sm"
                  pending={busy("email")}
                  pendingLabel="Envoi…"
                  disabled={!recipientEmail || blocked("email")}
                >
                  <Mail aria-hidden />
                  Envoyer par e-mail à l’école
                </PendingButton>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Envoyer la facture {number} ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    L’envoi est définitif : la facture ne pourra plus être supprimée.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Destinataire</dt>
                  <dd className="break-all">{recipientEmail}</dd>
                  <dt className="text-muted-foreground">Facture</dt>
                  <dd>{number}</dd>
                  <dt className="text-muted-foreground">Montant TTC</dt>
                  <dd className="font-medium">{eur(amountIncVat)}</dd>
                  <dt className="text-muted-foreground">Pièce jointe</dt>
                  <dd>facture-{number}.pdf (Factur-X)</dd>
                </dl>
                <p className="text-sm">
                  <PreviewLink
                    href={`/api/invoices/${invoiceId}/pdf?inline=1`}
                    className="inline-flex items-center gap-1 underline underline-offset-2"
                  >
                    <ExternalLink aria-hidden className="size-4" />
                    Aperçu du PDF
                    <span className="sr-only"> — s’ouvre dans un nouvel onglet</span>
                  </PreviewLink>
                </p>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={() => run("email", sendInvoiceByEmail)}>
                    Envoyer à {recipientEmail}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <PendingButton
              type="button"
              size="sm"
              variant="secondary"
              pending={busy("sent")}
              pendingLabel="Enregistrement…"
              disabled={blocked("sent")}
              onClick={() => run("sent", markInvoiceSent)}
            >
              <Send aria-hidden />
              Marquer comme envoyée
            </PendingButton>
          </>
        ) : null}
        {status === "sent" ? (
          <PendingButton
            type="button"
            size="sm"
            pending={busy("paid")}
            pendingLabel="Enregistrement…"
            disabled={blocked("paid")}
            onClick={() => run("paid", markInvoicePaid)}
          >
            <BadgeEuro aria-hidden />
            Marquer comme payée
          </PendingButton>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="ghost">
              <Ellipsis aria-hidden />
              Plus<span className="sr-only"> d’actions sur la facture</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <a href={`/api/invoices/${invoiceId}/xml`}>
                <FileCode aria-hidden />
                Télécharger le XML
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {status === "ready" ? (
          <ConfirmDeleteButton
            itemName={`la facture ${number}`}
            title={`Supprimer la facture ${number} ?`}
            description="La facture n’a pas été envoyée : elle sera supprimée et son numéro pourra être réattribué. Vous pourrez la générer à nouveau."
            onConfirm={() => run("delete", deleteInvoice)}
          />
        ) : null}
      </div>
      {!recipientEmail && status === "ready" ? (
        <p className="text-muted-foreground text-sm">
          Aucun e-mail de facturation pour l’école : renseignez-le dans Réglages, ou marquez la
          facture comme envoyée après un dépôt manuel.
        </p>
      ) : null}
      {state?.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
