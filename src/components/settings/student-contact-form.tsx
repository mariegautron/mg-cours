"use client";

import { useActionState } from "react";

import { ActionError } from "@/components/action-error";
import { saveStudentContact, type SettingsFormState } from "@/app/(app)/settings/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { keepFormValues } from "@/lib/use-kept-form";

/** Adresse que voient les étudiant·es (« Une question ? Écris à Marie : … »). */
export function StudentContactForm({ value }: { value: string | null }) {
  const [state, formAction, pending] = useActionState<SettingsFormState, FormData>(
    saveStudentContact,
    {},
  );
  const errors = state.fieldErrors?.studentContactEmail;
  return (
    <form onSubmit={keepFormValues(formAction)} className="space-y-2">
      <Label htmlFor="student-contact">E-mail de contact pour les étudiant·es</Label>
      <p id="student-contact-hint" className="text-muted-foreground text-sm">
        Affiché en bas de leur espace et du lien de la classe. Ce n’est pas l’e-mail de tes
        factures. Vide : aucun contact affiché.
      </p>
      <Input
        id="student-contact"
        name="studentContactEmail"
        type="email"
        defaultValue={value ?? ""}
        placeholder="prenom.nom@ecole.com"
        aria-describedby={`student-contact-hint${errors?.length ? " student-contact-error" : ""}`}
        aria-invalid={errors?.length ? true : undefined}
      />
      {errors?.length ? (
        <p id="student-contact-error" role="alert" className="text-destructive text-sm">
          {errors.join(" ")}
        </p>
      ) : null}
      {state.error ? <ActionError error={state.error} /> : null}
      <div className="flex items-center gap-3">
        <PendingButton type="submit" pending={pending} pendingLabel="Enregistrement…">
          Enregistrer l’e-mail de contact
        </PendingButton>
        <p role="status" className="text-sm">
          {state.saved ? "E-mail de contact enregistré." : ""}
        </p>
      </div>
    </form>
  );
}
