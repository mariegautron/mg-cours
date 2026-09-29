"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";

import { ActionError } from "@/components/action-error";
import { saveProfile, type SettingsFormState } from "@/app/(app)/settings/actions";
import { PendingButton } from "@/components/ui/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { groupIban, parseBankDetails } from "@/lib/settings/bank";
import { profileCompleteness } from "@/lib/settings/completeness";
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-guard";
import type { Tables } from "@/types/db";
import { keepFormValues } from "@/lib/use-kept-form";

const initial: SettingsFormState = {};

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
      {errors.join(" ")}
    </p>
  );
}

function Hint({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={`${id}-hint`} className="text-muted-foreground text-sm">
      {children}
    </p>
  );
}

/** Relie l'aide et l'éventuelle erreur d'un champ. */
function describedBy(id: string, hasHint: boolean, errors?: string[]) {
  return (
    [hasHint ? `${id}-hint` : null, errors?.length ? `${id}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined
  );
}

function Group({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 block w-full border-b pb-2 text-base font-semibold">{legend}</legend>
      {children}
    </fieldset>
  );
}

const lastUpdated = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

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
  const [ibanValue, setIbanValue] = useState(bank.iban);
  const completeness = profileCompleteness(profile);

  useUnsavedChangesGuard(dirty);

  return (
    <div className="space-y-4">
      <div role="status" className="rounded-lg border p-4">
        <p className="mb-1 text-sm font-medium">Profil complété à {completeness.percent} %</p>
        <progress
          value={completeness.percent}
          max={100}
          className="[&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary h-2 w-full overflow-hidden rounded-full"
        />
        {completeness.missing.length ? (
          <p className="text-muted-foreground mt-2 text-sm">
            À compléter pour pouvoir facturer : {completeness.missing.join(", ")}.
          </p>
        ) : (
          <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
            Toutes les informations nécessaires à la facturation sont renseignées.
          </p>
        )}
      </div>

      <form
        onSubmit={keepFormValues(formAction)}
        onChange={() => setDirty(true)}
        className="space-y-6"
      >
        <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
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
              <Textarea
                id="address"
                name="address"
                rows={2}
                defaultValue={profile?.address ?? ""}
              />
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
                  aria-describedby={describedBy("siret", true, fe.siret)}
                />
                <Hint id="siret">14 chiffres, espaces acceptés.</Hint>
                <FieldError id="siret" errors={fe.siret} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activityNumber">N° de déclaration d’activité (NDA)</Label>
                <Input
                  id="activityNumber"
                  name="activityNumber"
                  defaultValue={profile?.activity_number ?? ""}
                  aria-invalid={fe.activityNumber ? true : undefined}
                  aria-describedby={describedBy("activityNumber", true, fe.activityNumber)}
                />
                <Hint id="activityNumber">
                  11 chiffres, délivré par la DREETS. Laisse vide si tu n’es pas organisme de
                  formation.
                </Hint>
                <FieldError id="activityNumber" errors={fe.activityNumber} />
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
                La mention « TVA non applicable, art. 293 B du CGI » figurera sur tes factures.
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
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  defaultValue={profile?.phone ?? ""}
                  aria-invalid={fe.phone ? true : undefined}
                  aria-describedby={fe.phone ? "phone-error" : undefined}
                />
                <FieldError id="phone" errors={fe.phone} />
              </div>
            </div>
          </Group>

          <Group legend="Coordonnées bancaires">
            <p className="text-muted-foreground -mt-1 text-sm">
              Visible uniquement par toi ; reprise sur tes factures.
            </p>
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <div className="space-y-2">
                <Label htmlFor="iban">IBAN</Label>
                <Input
                  id="iban"
                  name="iban"
                  autoComplete="off"
                  spellCheck={false}
                  value={ibanValue}
                  onChange={(e) => setIbanValue(groupIban(e.target.value))}
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
        </div>

        {state.error ? <ActionError error={state.error} /> : null}
        <div className="flex flex-wrap items-center gap-3">
          <PendingButton
            type="submit"
            pending={pending}
            pendingLabel="Enregistrement…"
            disabled={!dirty}
          >
            Enregistrer les modifications
          </PendingButton>
          <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
            {state.saved && !dirty ? (
              <span className="inline-flex items-center gap-1">
                <Check aria-hidden className="size-4" />
                Modifications enregistrées
              </span>
            ) : null}
          </p>
        </div>
        {profile?.updated_at ? (
          <p className="text-muted-foreground text-sm">
            Dernière mise à jour : {lastUpdated(profile.updated_at)}
          </p>
        ) : null}
      </form>
    </div>
  );
}
