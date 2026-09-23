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
}: {
  moduleId: string;
  /** `null` = trame jamais générée. */
  status: "draft" | "sent" | "validated" | null;
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
        <form action={genAction}>
          <Button type="submit" size="sm" variant="secondary" disabled={genPending}>
            <FileText aria-hidden />
            {status ? "Régénérer la trame" : "Générer la trame"}
          </Button>
        </form>
        {status ? (
          <Button asChild size="sm" variant="secondary">
            <a href={`/api/modules/${moduleId}/outline`}>
              <Download aria-hidden />
              Télécharger le PDF
            </a>
          </Button>
        ) : null}
        {status === "draft" ? (
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
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
