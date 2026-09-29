"use client";

import { useState, useTransition } from "react";
import { CircleCheck } from "lucide-react";

import {
  markExternalInvoicePaid,
  type BillingActionState,
} from "@/app/(app)/modules/[id]/billing/actions";
import { PendingButton } from "@/components/ui/pending-button";

export function ExternalInvoicePaid({ moduleId, paid }: { moduleId: string; paid: boolean }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<BillingActionState | null>(null);

  if (paid) {
    return (
      <p className="flex items-center gap-2 text-sm">
        <CircleCheck aria-hidden className="size-4 text-emerald-600 dark:text-emerald-400" />
        Module marqué comme payé.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <PendingButton
        type="button"
        size="sm"
        pending={pending}
        pendingLabel="Enregistrement…"
        onClick={() => start(async () => setState(await markExternalInvoicePaid(moduleId)))}
      >
        Marquer le module comme payé
      </PendingButton>
      {state?.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
