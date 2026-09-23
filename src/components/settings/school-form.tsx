"use client";

import { useActionState } from "react";
import Link from "next/link";

import type { SettingsFormState } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/types/db";

type Action = (state: SettingsFormState, formData: FormData) => Promise<SettingsFormState>;

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
      {errors.join(" ")}
    </p>
  );
}

export function SchoolForm({ action, school }: { action: Action; school?: Tables<"school"> }) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nom de l’école / campus</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={school?.name ?? ""}
          aria-describedby={fe.name ? "name-error" : undefined}
        />
        <FieldError id="name" errors={fe.name} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="siret">SIRET</Label>
          <Input
            id="siret"
            name="siret"
            defaultValue={school?.siret ?? ""}
            aria-describedby={fe.siret ? "siret-error" : undefined}
          />
          <FieldError id="siret" errors={fe.siret} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paIdentifier">Identifiant Plateforme Agréée</Label>
          <Input id="paIdentifier" name="paIdentifier" defaultValue={school?.pa_identifier ?? ""} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="billingEmail">E-mail de facturation</Label>
          <Input
            id="billingEmail"
            name="billingEmail"
            type="email"
            defaultValue={school?.billing_email ?? ""}
            aria-describedby={fe.billingEmail ? "billingEmail-error" : undefined}
          />
          <FieldError id="billingEmail" errors={fe.billingEmail} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">Adresse</Label>
          <Input id="address" name="address" defaultValue={school?.address ?? ""} />
        </div>
      </div>
      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/settings">Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
