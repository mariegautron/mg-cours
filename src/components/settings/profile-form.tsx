"use client";

import { useActionState, useState } from "react";

import { saveProfile, type SettingsFormState } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/types/db";

const initial: SettingsFormState = {};

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
      {errors.join(" ")}
    </p>
  );
}

export function ProfileForm({ profile }: { profile: Tables<"teacher_profile"> | null }) {
  const [state, formAction, pending] = useActionState(saveProfile, initial);
  const fe = state.fieldErrors ?? {};
  const [vatExempt, setVatExempt] = useState(profile?.vat_exempt ?? false);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div className="space-y-2">
        <Label htmlFor="legalName">Nom / raison sociale</Label>
        <Input
          id="legalName"
          name="legalName"
          required
          defaultValue={profile?.legal_name ?? ""}
          aria-describedby={fe.legalName ? "legalName-error" : undefined}
        />
        <FieldError id="legalName" errors={fe.legalName} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Adresse</Label>
        <Textarea id="address" name="address" rows={2} defaultValue={profile?.address ?? ""} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="siret">SIRET</Label>
          <Input
            id="siret"
            name="siret"
            defaultValue={profile?.siret ?? ""}
            aria-describedby={fe.siret ? "siret-error" : undefined}
          />
          <FieldError id="siret" errors={fe.siret} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="activityNumber">N° de déclaration d’activité (NDA)</Label>
          <Input
            id="activityNumber"
            name="activityNumber"
            defaultValue={profile?.activity_number ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={profile?.email ?? ""}
            aria-describedby={fe.email ? "email-error" : undefined}
          />
          <FieldError id="email" errors={fe.email} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="vatExempt"
          checked={vatExempt}
          onChange={(e) => setVatExempt(e.target.checked)}
        />
        TVA non applicable (art. 293 B du CGI)
      </label>
      {vatExempt ? (
        <input type="hidden" name="vatNumber" value={profile?.vat_number ?? ""} />
      ) : (
        <div className="space-y-2">
          <Label htmlFor="vatNumber">N° de TVA intracommunautaire</Label>
          <Input id="vatNumber" name="vatNumber" defaultValue={profile?.vat_number ?? ""} />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="bankDetails">RIB (IBAN + BIC)</Label>
        <Textarea
          id="bankDetails"
          name="bankDetails"
          rows={2}
          defaultValue={profile?.bank_details ?? ""}
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      {state.saved ? (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
          Profil enregistré.
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer le profil"}
      </Button>
    </form>
  );
}
