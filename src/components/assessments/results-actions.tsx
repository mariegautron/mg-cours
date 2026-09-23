"use client";

import { useState, useTransition } from "react";
import { Download, Mail } from "lucide-react";

import {
  sendResultsEmail,
  type EmailState,
} from "@/app/(app)/modules/[id]/assessments/email-action";
import { Button } from "@/components/ui/button";

export function ResultsActions({
  moduleId,
  assessmentId,
  hasGrades,
}: {
  moduleId: string;
  assessmentId: string;
  hasGrades: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<EmailState | null>(null);

  if (!hasGrades) {
    return (
      <p className="text-muted-foreground text-sm">
        Saisissez au moins une note pour exporter ou envoyer les résultats.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="secondary">
          <a href={`/api/modules/${moduleId}/assessments/${assessmentId}/results`}>
            <Download aria-hidden />
            Exporter les résultats (PDF)
          </a>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => setState(await sendResultsEmail(moduleId, assessmentId)))
          }
        >
          <Mail aria-hidden />
          {pending ? "Envoi…" : "Envoyer par e-mail"}
        </Button>
      </div>
      {state?.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      {state?.sent !== undefined && !state.error ? (
        <p role="status" className="text-sm">
          {state.sent} e-mail{state.sent > 1 ? "s" : ""} envoyé{state.sent > 1 ? "s" : ""}.
          {state.skipped?.length ? ` Sans e-mail : ${state.skipped.join(", ")}.` : ""}
        </p>
      ) : null}
    </div>
  );
}
