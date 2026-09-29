"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";

import { ActionError } from "@/components/action-error";
import { login, type LoginState } from "@/app/login/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: LoginState = {};

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <Card className="halo w-full max-w-sm">
      <CardHeader>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Bienvenue</h1>
        <CardDescription>Connexion à ton espace pédagogique.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {state.error ? <ActionError error={state.error} /> : null}
          <PendingButton
            type="submit"
            className="w-full"
            pending={pending}
            pendingLabel="Connexion…"
          >
            Se connecter
          </PendingButton>
        </form>
      </CardContent>
    </Card>
  );
}
