"use client";

import { useActionState } from "react";
import { CheckCheck, Download, FileText, Send } from "lucide-react";

import {
  generateOutline,
  markOutlineSent,
  markOutlineValidated,
  type OutlineActionState,
} from "@/app/(app)/modules/[id]/outline/actions";
import { Button } from "@/components/ui/button";

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
            <Button type="submit" size="sm" variant="secondary" disabled={genPending}>
              <FileText aria-hidden />
              {hasDepositedOutline
                ? "Générer une trame depuis les séances"
                : status
                  ? "Régénérer la trame"
                  : "Générer la trame"}
            </Button>
          </form>
        ) : null}
        {status ? (
          <Button asChild size="sm" variant="secondary">
            <a href={`/api/modules/${moduleId}/outline`}>
              <Download aria-hidden />
              Télécharger le PDF
            </a>
          </Button>
        ) : null}
        {status === "draft" && !hasDepositedOutline && !archived ? (
          <form action={sentAction}>
            <Button type="submit" size="sm" disabled={sentPending}>
              <Send aria-hidden />
              Marquer comme envoyée
            </Button>
          </form>
        ) : null}
        {status === "sent" ? (
          <form action={valAction}>
            <Button type="submit" size="sm" disabled={valPending}>
              <CheckCheck aria-hidden />
              Marquer comme validée
            </Button>
          </form>
        ) : null}
      </div>
      {hasDepositedOutline && !archived ? (
        <p className="text-muted-foreground text-sm">
          La trame déposée reste la version envoyée à l’école.
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
