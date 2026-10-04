"use client";

import { useActionState, type ReactNode } from "react";

import type { MatchState } from "@/app/(app)/modules/[id]/matching/actions";
import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";
import { PendingButton } from "@/components/ui/pending-button";

/**
 * Un geste du rapprochement (associer, retirer, créer, écarter) : le bouton dit qu'il travaille
 * (« Association… »), un second appui est ignoré, le résultat est annoncé (`role="status"`) et une
 * erreur reste visible avec son issue. L'état de la page se met à jour dès que l'action finit.
 */
export function MatchingForm({
  action,
  label,
  pendingLabel,
  ariaLabel,
  variant = "secondary",
  className,
  children,
}: {
  action: (prev: MatchState, formData: FormData) => Promise<MatchState>;
  label: string;
  pendingLabel: string;
  ariaLabel?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
  children?: ReactNode;
}) {
  const [state, formAction, pending] = useActionState<MatchState, FormData>(action, {});
  return (
    <form action={formAction} className={className}>
      {children}
      <PendingButton
        type="submit"
        variant={variant}
        aria-label={ariaLabel}
        pending={pending}
        pendingLabel={pendingLabel}
      >
        {label}
      </PendingButton>
      <p role="status" className="sr-only">
        {state.done ?? ""}
      </p>
      {state.error ? <ActionError error={state.error} className="mt-1" /> : null}
    </form>
  );
}
