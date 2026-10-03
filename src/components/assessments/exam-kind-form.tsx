"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { saveIndividualPrep } from "@/app/(app)/modules/[id]/assessments/prep-actions";
import { ActionError } from "@/components/action-error";
import {
  EXAM_KINDS,
  SUBJECT_VERSIONS,
  SUBMISSION_MODES,
  type ExamKind,
  type SubjectVersions,
  type SubmissionMode,
} from "@/lib/assessments/exam-kind";
import { cn } from "@/lib/utils";

function Choice<T extends string>({
  name,
  legend,
  options,
  value,
  disabled,
  onChange,
}: {
  name: string;
  legend: string;
  options: { value: T; label: string }[];
  value: T | null;
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="text-muted-foreground mb-1.5 text-sm">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              "has-[:focus-visible]:ring-ring flex min-h-11 cursor-pointer items-center rounded-xl border-[1.5px] px-4 text-sm font-semibold has-[:focus-visible]:ring-2",
              value === o.value
                ? "bg-primary text-primary-foreground border-transparent"
                : "bg-muted/40",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * « Quelle épreuve ? » (maquette IndPrep) : type d'épreuve, versions du sujet, arrivée des rendus,
 * sujet de rattrapage préparé d'avance. Chaque choix s'enregistre tout seul.
 */
export function ExamKindForm({
  moduleId,
  assessmentId,
  initial,
  available,
  quizHref,
}: {
  moduleId: string;
  assessmentId: string;
  initial: {
    kind: ExamKind;
    versions: SubjectVersions;
    mode: SubmissionMode | null;
    makeupPrepared: boolean;
  };
  /** Les colonnes existent en base (migration appliquée). */
  available: boolean;
  quizHref: string;
}) {
  const [state, setState] = useState(initial);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  function save(next: typeof state, patch: Parameters<typeof saveIndividualPrep>[2]) {
    setState(next);
    start(async () => {
      const result = await saveIndividualPrep(moduleId, assessmentId, patch);
      if (result.error) {
        setError(result.error);
        setMessage("");
      } else {
        setError(null);
        setMessage(result.savedAt ? `Enregistré à ${result.savedAt}.` : "");
      }
    });
  }

  return (
    <div className="space-y-3">
      <Choice
        name="exam-kind"
        legend="Type d’épreuve"
        options={EXAM_KINDS}
        value={state.kind}
        disabled={pending}
        onChange={(kind) => save({ ...state, kind }, { examKind: kind })}
      />
      <p className="text-muted-foreground text-sm">
        Un rendu peut comporter un ou plusieurs fichiers. Un QCM tire ses questions de ta banque :{" "}
        <Link
          href={quizHref}
          className="text-primary font-semibold underline-offset-2 hover:underline"
        >
          préparer le QCM
        </Link>
        .
      </p>
      <Choice
        name="subject-versions"
        legend="Sujet"
        options={SUBJECT_VERSIONS}
        value={state.versions}
        disabled={pending}
        onChange={(versions) => save({ ...state, versions }, { subjectVersions: versions })}
      />
      {state.kind === "files" ? (
        <>
          <Choice
            name="submission-mode"
            legend="Comment les rendus arrivent"
            options={SUBMISSION_MODES}
            value={state.mode}
            disabled={pending}
            onChange={(mode) => save({ ...state, mode }, { submissionMode: mode })}
          />
          <p className="text-muted-foreground text-sm">
            Fichiers, ou liens GitHub, Figma ou autre. Tu peux mélanger d’une personne à l’autre.
          </p>
        </>
      ) : null}
      <label className="flex min-h-12 items-start gap-3">
        <input
          type="checkbox"
          checked={state.makeupPrepared}
          disabled={pending}
          onChange={(e) =>
            save(
              { ...state, makeupPrepared: e.target.checked },
              { makeupPrepared: e.target.checked },
            )
          }
          className="accent-primary mt-1 size-5"
        />
        <span>
          <strong>Préparer d’avance un sujet de rattrapage</strong>
          <span className="text-muted-foreground block text-sm">
            Pour une personne absente et excusée : sujet similaire, même grille, même coefficient.
          </span>
        </span>
      </label>
      <p role="status" className="min-h-5 text-sm font-medium">
        {message}
      </p>
      {error ? <ActionError error={error} /> : null}
      {available ? null : (
        <p className="text-muted-foreground text-xs">
          Ces choix seront gardés après la mise à jour de la base de données.
        </p>
      )}
    </div>
  );
}
