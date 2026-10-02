"use client";

import { useActionState } from "react";

import { saveSchoolRules, type SchoolRulesState } from "@/app/(app)/settings/actions";
import { ActionError } from "@/components/action-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import {
  ABSENCE_RULE_LABELS,
  emailFromTemplate,
  type SchoolRules,
} from "@/lib/settings/school-rules";
import { keepFormValues } from "@/lib/use-kept-form";

/** Règles d'une école : absence excusée, modèle d'adresse des étudiant·es, longueur d'appréciation. */
export function SchoolRulesForm({
  schoolId,
  schoolName,
  rules,
  available,
}: {
  schoolId: string;
  schoolName: string;
  rules: SchoolRules;
  /** La table des règles existe : sinon on montre les valeurs par défaut, sans pouvoir les changer. */
  available: boolean;
}) {
  const [state, action, pending] = useActionState<SchoolRulesState, FormData>(
    saveSchoolRules.bind(null, schoolId),
    {},
  );
  const id = `rules-${schoolId}`;
  const example = rules.emailTemplate
    ? emailFromTemplate(rules.emailTemplate, "Éloïse", "Dupont-Martin")
    : null;

  return (
    <form
      onSubmit={keepFormValues(action)}
      aria-labelledby={`${id}-title`}
      className="space-y-4 rounded-lg border p-4"
    >
      <h3 id={`${id}-title`} className="font-medium">
        {schoolName}
      </h3>
      <fieldset className="space-y-1" disabled={!available}>
        <legend className="mb-1 text-sm font-medium">Absence excusée</legend>
        {(["keep_group_grade", "makeup"] as const).map((value) => (
          <label key={value} className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="radio"
              name="absenceRule"
              value={value}
              defaultChecked={rules.absenceRule === value}
              className="accent-primary size-4"
            />
            {ABSENCE_RULE_LABELS[value]}
          </label>
        ))}
        <p className="text-muted-foreground text-xs">
          Une absence non prévenue vaut toujours 0 : ce n’est pas un réglage.
        </p>
      </fieldset>

      <div className="space-y-1">
        <Label htmlFor={`${id}-email`}>Adresse e-mail des étudiant·es</Label>
        <Input
          id={`${id}-email`}
          name="emailTemplate"
          defaultValue={rules.emailTemplate}
          placeholder="{prenom}.{nom}@ecole.fr"
          disabled={!available}
          autoComplete="off"
          aria-describedby={`${id}-email-hint`}
          aria-invalid={state.fieldErrors?.emailTemplate ? true : undefined}
        />
        <p id={`${id}-email-hint`} className="text-muted-foreground text-xs">
          Variables : {"{prenom}"} et {"{nom}"} (sans accents, en minuscules).
          {example ? ` Exemple : ${example}.` : ""}
        </p>
        {state.fieldErrors?.emailTemplate ? (
          <p role="alert" className="text-destructive text-sm">
            {state.fieldErrors.emailTemplate}
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor={`${id}-max`}>Longueur maximale d’une appréciation (caractères)</Label>
        <Input
          id={`${id}-max`}
          name="appreciationMax"
          type="number"
          inputMode="numeric"
          min={50}
          max={2000}
          defaultValue={rules.appreciationMax}
          disabled={!available}
          className="w-32"
          aria-invalid={state.fieldErrors?.appreciationMax ? true : undefined}
        />
        {state.fieldErrors?.appreciationMax ? (
          <p role="alert" className="text-destructive text-sm">
            {state.fieldErrors.appreciationMax}
          </p>
        ) : null}
      </div>

      {available ? (
        <PendingButton type="submit" pending={pending} pendingLabel="Enregistrement…">
          Enregistrer les règles
        </PendingButton>
      ) : (
        <p className="text-muted-foreground text-sm">
          Ces réglages sont affichés avec leurs valeurs par défaut : tu pourras les modifier dès que
          la mise à jour de la base sera faite.
        </p>
      )}
      <p role="status" className="min-h-5 text-sm font-medium">
        {state.message ?? ""}
      </p>
      {state.error ? <ActionError error={state.error} /> : null}
    </form>
  );
}
