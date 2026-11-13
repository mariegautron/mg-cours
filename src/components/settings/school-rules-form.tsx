"use client";

import { useActionState, useState } from "react";

import { saveSchoolRules, type SchoolRulesState } from "@/app/(app)/settings/actions";
import { ActionError } from "@/components/action-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { emailFromTemplate, type SchoolRules } from "@/lib/settings/school-rules";
import { DEFAULT_SCHOOL_LABEL } from "@/lib/schools/rules";
import { YNOV_GRADING, type GradingRules } from "@/lib/ynov/notation";

/** Lignes de paliers affichées : celles de l'école, plus une vide pour en ajouter un. */
const BRACKET_ROWS = 5;
import { keepFormValues } from "@/lib/use-kept-form";

/** Règles d'une école : absence excusée, modèle d'adresse des étudiant·es, longueur d'appréciation. */
export function SchoolRulesForm({
  schoolId,
  schoolName,
  rules,
  available,
  isNew = false,
}: {
  schoolId: string;
  schoolName: string;
  rules: SchoolRules;
  /** La table des règles existe : sinon on montre les valeurs par défaut, sans pouvoir les changer. */
  available: boolean;
  /** École tout juste créée : étape « Règles de notation » mise en avant. */
  isNew?: boolean;
}) {
  const [state, action, pending] = useActionState<SchoolRulesState, FormData>(
    saveSchoolRules.bind(null, schoolId),
    {},
  );
  const id = `rules-${schoolId}`;
  // « Reprendre les règles de Nantes Ynov Campus » : remonte les champs avec les valeurs YNOV.
  const [grading, setGrading] = useState<GradingRules>(rules.grading);
  const [gradingKey, setGradingKey] = useState(0);
  const brackets = Array.from({ length: BRACKET_ROWS }, (_, i) => grading.brackets[i] ?? null);
  const example = rules.emailTemplate
    ? emailFromTemplate(rules.emailTemplate, "Éloïse", "Dupont-Martin")
    : null;

  return (
    <form
      onSubmit={keepFormValues(action)}
      id={id}
      aria-labelledby={`${id}-title`}
      className={`scroll-mt-20 space-y-4 rounded-lg border p-4 ${isNew ? "border-primary ring-primary/30 ring-2" : ""}`}
    >
      <h3 id={`${id}-title`} className="text-sm font-semibold">
        {schoolName}
      </h3>
      {isNew ? (
        <p className="text-sm">
          Étape 2 sur 2 : ses règles de notation. Reprends celles de Nantes Ynov Campus en un clic,
          puis change ce qui diffère.
        </p>
      ) : null}
      <div className="space-y-1">
        <input type="hidden" name="absenceRule" value="keep_group_grade" />
        <p className="text-sm font-medium">Absence excusée à un travail de groupe</p>
        <p className="text-muted-foreground text-xs">
          La personne garde la note du groupe, sans rattrapage. À une évaluation individuelle, une
          absence excusée donne toujours droit à un rattrapage. Une absence non prévenue vaut 0 par
          défaut ; sur un travail de groupe, tu peux choisir sur la copie « Absent·e · garde la note
          du groupe ».
        </p>
      </div>

      <fieldset
        key={gradingKey}
        className="space-y-3"
        disabled={!available}
        aria-describedby={`${id}-grading-hint`}
      >
        <legend className="mb-1 text-sm font-medium">Règles de notation</legend>
        <p id={`${id}-grading-hint`} className="text-muted-foreground text-xs">
          Toutes les notes sont ramenées sur 20 avant le calcul de la moyenne.
        </p>
        <button
          type="button"
          className="focus-visible:ring-ring hover:bg-accent inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none"
          onClick={() => {
            setGrading(YNOV_GRADING);
            setGradingKey((k) => k + 1);
          }}
        >
          Reprendre les règles de {DEFAULT_SCHOOL_LABEL}
        </button>
        <div className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <Label htmlFor={`${id}-gcoef`}>Coefficient d’une note de groupe</Label>
            <Input
              id={`${id}-gcoef`}
              name="groupCoefficient"
              inputMode="decimal"
              defaultValue={String(grading.groupCoefficient).replace(".", ",")}
              className="w-24"
              aria-invalid={state.fieldErrors?.grading ? true : undefined}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-icoef`}>Coefficient d’une note individuelle</Label>
            <Input
              id={`${id}-icoef`}
              name="individualCoefficient"
              inputMode="decimal"
              defaultValue={String(grading.individualCoefficient).replace(".", ",")}
              className="w-24"
              aria-invalid={state.fieldErrors?.grading ? true : undefined}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="text-sm">
            <caption className="mb-1 text-left text-sm font-medium">
              Notes exigées selon les heures du module
            </caption>
            <thead>
              <tr className="text-muted-foreground text-left text-xs">
                <th scope="col" className="pr-2 font-medium">
                  De (h)
                </th>
                <th scope="col" className="pr-2 font-medium">
                  À (h)
                </th>
                <th scope="col" className="pr-2 font-medium">
                  Notes de groupe
                </th>
                <th scope="col" className="font-medium">
                  Notes individuelles
                </th>
              </tr>
            </thead>
            <tbody>
              {brackets.map((b, i) => (
                <tr key={i}>
                  {(
                    [
                      ["bracketMin", b?.minHours, "De"],
                      ["bracketMax", b?.maxHours, "À"],
                      ["bracketGroup", b?.group, "Notes de groupe"],
                      ["bracketIndividual", b?.individual, "Notes individuelles"],
                    ] as const
                  ).map(([name, value, label]) => (
                    <td key={name} className="py-1 pr-2">
                      <Input
                        name={name}
                        inputMode="numeric"
                        defaultValue={value ?? ""}
                        aria-label={`${label}, palier ${i + 1}`}
                        className="w-20"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-muted-foreground text-xs">
          Une ligne vide est ignorée. Hors palier, le palier le plus proche s’applique.
        </p>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="bonusAllowed"
            defaultChecked={grading.bonusAllowed}
            className="accent-primary size-4"
          />
          Note bonus de certification : elle peut remonter la moyenne, jamais la baisser
        </label>
        {state.fieldErrors?.grading ? (
          <p role="alert" className="text-destructive text-sm">
            {state.fieldErrors.grading}
          </p>
        ) : null}
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
          {example ? ` Exemple : ${example}.` : ""} Sert seulement à proposer une adresse quand
          aucune n’est enregistrée : l’adresse saisie ou importée pour chaque étudiant·e passe
          toujours avant.
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
