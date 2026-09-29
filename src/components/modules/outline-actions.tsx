"use client";

import { useActionState } from "react";
import { CheckCheck, FileText, Send } from "lucide-react";

import {
  generateOutline,
  markOutlineSent,
  markOutlineValidated,
  type OutlineActionState,
} from "@/app/(app)/modules/[id]/outline/actions";
import { DownloadButton } from "@/components/download-button";
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
  const [sentState, sentAction, sentPending] = useActionState(
    markOutlineSent.bind(null, moduleId),
    initial,
  );
  const [valState, valAction, valPending] = useActionState(
    markOutlineValidated.bind(null, moduleId),
    initial,
  );
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
          <form action={sentAction}>
            <PendingButton
              type="submit"
              size="sm"
              pending={sentPending}
              pendingLabel="Enregistrement…"
            >
              <Send aria-hidden />
              Marquer comme envoyée
            </PendingButton>
          </form>
        ) : null}
        {status === "sent" ? (
          <form action={valAction}>
            <PendingButton
              type="submit"
              size="sm"
              pending={valPending}
              pendingLabel="Enregistrement…"
            >
              <CheckCheck aria-hidden />
              Marquer comme validée
            </PendingButton>
          </form>
        ) : null}
      </div>
      {hasDepositedOutline && !archived ? (
        <p className="text-muted-foreground text-sm">
          La progression déposée reste la version envoyée à l’école.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
