"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
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
  const [shown, setShown] = useState(false);

  return (
    <Card className="halo w-full max-w-sm">
      <CardHeader>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Connexion</h1>
        <CardDescription>Connexion à ton espace pédagogique.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div className="space-y-2">
            <Label htmlFor="email">Adresse e-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={shown ? "text" : "password"}
                autoComplete="current-password"
                required
                className="pr-24"
              />
              <button
                type="button"
                onClick={() => setShown((v) => !v)}
                aria-pressed={shown}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 absolute inset-y-0 right-0 flex min-w-20 items-center justify-center rounded-r-md px-3 text-sm font-semibold focus-visible:ring-3"
              >
                {shown ? "Masquer" : "Afficher"}
              </button>
            </div>
          </div>
          <Link
            href="/login/oubli"
            className="text-primary inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-2"
          >
            Mot de passe oublié ?
          </Link>
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
