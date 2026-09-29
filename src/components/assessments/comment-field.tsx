"use client";

import { useId, useRef } from "react";

import { PhraseBank } from "@/components/assessments/phrase-bank";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Phrase } from "@/lib/assessments/phrases";

/**
 * Zone de commentaire avec ses phrases réutilisables (repliées sous la zone). Sert au commentaire d'un
 * critère, aux points forts, aux progrès et au commentaire libre.
 */
export function CommentField<T extends Phrase>({
  name,
  label,
  value,
  onChange,
  rows = 2,
  phrases,
  criteria,
  subject,
  fixedCriterion,
  categories,
}: {
  /** Nom du champ envoyé avec le formulaire (ex. `comment_<critère>`, `strengths`). */
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  phrases: T[];
  criteria: { id: string; label: string }[];
  subject: string | null;
  fixedCriterion?: { id: string; label: string };
  categories?: Phrase["category"][];
}) {
  const uid = useId();
  const ref = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="space-y-1">
      <Label htmlFor={`${uid}-field`}>{label}</Label>
      <Textarea
        id={`${uid}-field`}
        name={name}
        ref={ref}
        rows={rows}
        maxLength={4000}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <details>
        <summary className="text-muted-foreground cursor-pointer text-xs">
          Phrases pour « {label} »
        </summary>
        <div className="mt-1">
          <PhraseBank
            phrases={phrases}
            criteria={criteria}
            subject={subject}
            value={value}
            onValueChange={onChange}
            textareaRef={ref}
            label={label}
            fixedCriterion={fixedCriterion}
            categories={categories}
          />
        </div>
      </details>
    </div>
  );
}
