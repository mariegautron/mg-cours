"use client";

import { useActionState, useTransition } from "react";
import { CheckCheck, FileText, Send } from "lucide-react";

import { ActionError } from "@/components/action-error";
import { Celebration } from "@/components/celebration";
import {
  generateOutline,
  markOutlineSent,
  markOutlineValidated,
  type OutlineActionState,
} from "@/app/(app)/modules/[id]/outline/actions";
import { DownloadButton } from "@/components/download-button";
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
import { PendingButton } from "@/components/ui/pending-button";

const initial: OutlineActionState = {};

export function OutlineActions({
  moduleId,
  status,
  hasDepositedOutline = false,
  archived = false,
}: {
  moduleId: string;
  /** `null` = trame jamais générée. */
  status: "draft" | "sent" | "validated" | null;
  /** Une trame déjà envoyée est déposée en PDF (voir « Documents ») : elle fait foi. */
  hasDepositedOutline?: boolean;
  /** Module archivé : plus besoin de générer ou d'envoyer une nouvelle trame. */
  archived?: boolean;
}) {
  const [genState, genAction, genPending] = useActionState(
    generateOutline.bind(null, moduleId),
    initial,
  );
  const [sentState, sentAction] = useActionState(markOutlineSent.bind(null, moduleId), initial);
  const [valState, valAction] = useActionState(markOutlineValidated.bind(null, moduleId), initial);
  // « Marquer comme envoyée / validée » ne se défait pas : un dialogue court demande confirmation.
  const [sentPending, startSent] = useTransition();
  const [valPending, startValidated] = useTransition();
  const error = genState.error ?? sentState.error ?? valState.error;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {!archived ? (
          <form action={genAction}>
            <PendingButton
              type="submit"
              size="sm"
              variant="secondary"
              pending={genPending}
              pendingLabel="Génération…"
            >
              <FileText aria-hidden />
              {hasDepositedOutline
                ? "Générer une progression depuis les séances"
                : status
                  ? "Régénérer la progression"
                  : "Générer la progression"}
            </PendingButton>
          </form>
        ) : null}
        {status ? (
          <DownloadButton
            href={`/api/modules/${moduleId}/outline`}
            doneLabel="Progression téléchargée."
          >
            Télécharger le PDF
          </DownloadButton>
        ) : null}
        {status === "draft" && !hasDepositedOutline && !archived ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <PendingButton
                type="button"
                size="sm"
                pending={sentPending}
                pendingLabel="Enregistrement…"
              >
                <Send aria-hidden />
                Marquer comme envoyée
              </PendingButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tu as bien envoyé la progression à l’école ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Les rappels J-15 et J-7 s’arrêtent, et ça ne se défait pas. Si tu ne l’as pas
                  encore envoyée, télécharge le PDF et envoie-le d’abord.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Pas encore</AlertDialogCancel>
                <AlertDialogAction onClick={() => startSent(() => sentAction())}>
                  Oui, je l’ai envoyée
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
        {status === "sent" ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <PendingButton
                type="button"
                size="sm"
                pending={valPending}
                pendingLabel="Enregistrement…"
              >
                <CheckCheck aria-hidden />
                Marquer comme validée
              </PendingButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>L’école a bien validé la progression ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tu ne pourras pas revenir en arrière une fois validée.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Pas encore</AlertDialogCancel>
                <AlertDialogAction onClick={() => startValidated(() => valAction())}>
                  Oui, elle est validée
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
      {hasDepositedOutline && !archived ? (
        <p className="text-muted-foreground text-sm">
          La progression déposée reste la version envoyée à l’école.
        </p>
      ) : null}
      <div aria-live="polite">
        {sentState.done ? (
          <Celebration>Progression envoyée. Les rappels s’arrêtent : bien joué.</Celebration>
        ) : null}
      </div>
      {error ? <ActionError error={error} /> : null}
    </div>
  );
}
