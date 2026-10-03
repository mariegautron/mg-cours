"use client";

import { useActionState } from "react";

import { changePassword, signOut, type AccountState } from "@/app/(app)/settings/actions";
import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { keepFormValues } from "@/lib/use-kept-form";

/** Compte : changer de mot de passe, se déconnecter. */
export function AccountSection() {
  const [state, action, pending] = useActionState<AccountState, FormData>(changePassword, {});
  return (
    <div className="space-y-4">
      <form onSubmit={keepFormValues(action)} className="space-y-3" aria-label="Mot de passe">
        <div className="space-y-1">
          <Label htmlFor="new-password">Nouveau mot de passe</Label>
          <Input
            id="new-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
          <Input
            id="confirm-password"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
        {state.error ? <ActionError error={state.error} /> : null}
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
          {state.saved ? "Mot de passe changé." : ""}
        </p>
        <PendingButton
          type="submit"
          variant="outline"
          size="touch"
          pending={pending}
          pendingLabel="Changement…"
        >
          Changer le mot de passe
        </PendingButton>
      </form>
      <form action={signOut} className="border-t pt-4">
        <Button type="submit" variant="outline" size="touch">
          Se déconnecter
        </Button>
      </form>
    </div>
  );
}
