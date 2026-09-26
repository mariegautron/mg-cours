"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";

import { saveProfile, type SettingsFormState } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseBankDetails } from "@/lib/settings/bank";
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

function Group({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 text-sm font-semibold">{legend}</legend>
      {children}
    </fieldset>
  );
}

export function ProfileForm({ profile }: { profile: Tables<"teacher_profile"> | null }) {
  const [state, formAction, pending] = useActionState(saveProfile, initial);
  const fe = state.fieldErrors ?? {};
  const [vatExempt, setVatExempt] = useState(profile?.vat_exempt ?? false);
  const [dirty, setDirty] = useState(false);
  const [lastState, setLastState] = useState(state);
  if (state !== lastState) {
    setLastState(state);
    if (state.saved) setDirty(false);
  }
  const bank = parseBankDetails(profile?.bank_details ?? null);

  return (
    <form action={formAction} onChange={() => setDirty(true)} className="max-w-xl space-y-8">
      <Group legend="Identité">
        <div className="space-y-2">
          <Label htmlFor="legalName">Nom / raison sociale</Label>
          <Input
            id="legalName"
            name="legalName"
            required
            defaultValue={profile?.legal_name ?? ""}
            aria-invalid={fe.legalName ? true : undefined}
            aria-describedby={fe.legalName ? "legalName-error" : undefined}
          />
          <FieldError id="legalName" errors={fe.legalName} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Adresse</Label>
          <Textarea id="address" name="address" rows={2} defaultValue={profile?.address ?? ""} />
        </div>
      </Group>

      <Group legend="Informations administratives">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="siret">SIRET</Label>
            <Input
              id="siret"
              name="siret"
              inputMode="numeric"
              defaultValue={profile?.siret ?? ""}
              aria-invalid={fe.siret ? true : undefined}
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
        </div>
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="vatExempt"
              checked={vatExempt}
              onChange={(e) => setVatExempt(e.target.checked)}
              aria-describedby="vatExempt-hint"
            />
            TVA non applicable (art. 293 B du CGI)
          </label>
          <p id="vatExempt-hint" className="text-muted-foreground pl-6 text-sm">
            La mention « TVA non applicable, art. 293 B du CGI » figurera sur vos factures.
          </p>
        </div>
        {vatExempt ? (
          <input type="hidden" name="vatNumber" value={profile?.vat_number ?? ""} />
        ) : (
          <div className="space-y-2">
            <Label htmlFor="vatNumber">N° de TVA intracommunautaire</Label>
            <Input id="vatNumber" name="vatNumber" defaultValue={profile?.vat_number ?? ""} />
          </div>
        )}
      </Group>

      <Group legend="Coordonnées">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={profile?.email ?? ""}
              aria-invalid={fe.email ? true : undefined}
              aria-describedby={fe.email ? "email-error" : undefined}
            />
            <FieldError id="email" errors={fe.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={profile?.phone ?? ""} />
          </div>
        </div>
      </Group>

      <Group legend="Coordonnées bancaires">
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div className="space-y-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              name="iban"
              autoComplete="off"
              spellCheck={false}
              defaultValue={bank.iban}
              aria-invalid={fe.iban ? true : undefined}
              aria-describedby={fe.iban ? "iban-error" : undefined}
            />
            <FieldError id="iban" errors={fe.iban} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bic">BIC</Label>
            <Input
              id="bic"
              name="bic"
              autoComplete="off"
              spellCheck={false}
              defaultValue={bank.bic}
              aria-invalid={fe.bic ? true : undefined}
              aria-describedby={fe.bic ? "bic-error" : undefined}
            />
            <FieldError id="bic" errors={fe.bic} />
          </div>
        </div>
      </Group>

      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || !dirty}>
          {pending ? "Enregistrement…" : "Enregistrer les modifications"}
        </Button>
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
          {state.saved && !dirty ? (
            <span className="inline-flex items-center gap-1">
              <Check aria-hidden className="size-4" />
              Modifications enregistrées
            </span>
          ) : null}
        </p>
      </div>
    </form>
  );
}
