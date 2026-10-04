"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  requestPasswordReset,
  setNewPassword,
  type NewPasswordState,
  type ResetRequestState,
} from "@/app/login/actions";
import { ActionError } from "@/components/action-error";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { keepFormValues } from "@/lib/use-kept-form";

/** Demande de lien : même réponse que l'adresse existe ou non. */
export function ResetRequestForm({ expired }: { expired: boolean }) {
  const [state, action, pending] = useActionState<ResetRequestState, FormData>(
    requestPasswordReset,
    {},
  );
  return (
    <Card className="halo w-full max-w-sm">
      <CardHeader>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Mot de passe oublié</h1>
        <CardDescription>
          {expired
            ? "Ce lien a expiré ou a déjà servi. Demande-en un nouveau."
            : "Donne ton adresse e-mail : tu recevras un lien pour choisir un nouveau mot de passe."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state.sent ? (
          <p role="status" className="text-sm">
            Si cette adresse correspond à un compte, un e-mail vient d’être envoyé. Ouvre le lien
            qu’il contient (il est valable une heure), puis choisis ton nouveau mot de passe.
          </p>
        ) : (
          <form onSubmit={keepFormValues(action)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Adresse e-mail</Label>
              <Input id="reset-email" name="email" type="email" autoComplete="email" required />
            </div>
            {state.error ? <ActionError error={state.error} /> : null}
            <PendingButton type="submit" className="w-full" pending={pending} pendingLabel="Envoi…">
              Envoyer le lien
            </PendingButton>
          </form>
        )}
        <Link
          href="/login"
          className="text-muted-foreground inline-flex min-h-11 items-center text-sm underline underline-offset-2"
        >
          Retour à la connexion
        </Link>
      </CardContent>
    </Card>
  );
}

/** Choix du nouveau mot de passe (la session de récupération est ouverte par le lien reçu). */
export function NewPasswordForm() {
  const [state, action, pending] = useActionState<NewPasswordState, FormData>(setNewPassword, {});
  return (
    <Card className="halo w-full max-w-sm">
      <CardHeader>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Nouveau mot de passe</h1>
        <CardDescription>Au moins 8 caractères. Tu seras connectée juste après.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={keepFormValues(action)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-pw">Nouveau mot de passe</Label>
            <Input
              id="new-pw"
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pw-confirm">Confirmer le mot de passe</Label>
            <Input
              id="new-pw-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
          {state.error ? (
            <>
              <ActionError error={state.error} />
              {state.error.includes("expiré") ? (
                <Link href="/login/oubli" className="text-sm underline underline-offset-2">
                  Demander un nouveau lien
                </Link>
              ) : null}
            </>
          ) : null}
          <PendingButton
            type="submit"
            className="w-full"
            pending={pending}
            pendingLabel="Changement…"
          >
            Changer le mot de passe
          </PendingButton>
        </form>
      </CardContent>
    </Card>
  );
}
