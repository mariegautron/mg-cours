"use client";

import { useId } from "react";

import {
  checksSummary,
  parseChecks,
  serializeChecks,
  toggleCheck,
} from "@/lib/assessments/expectations";

/**
 * Attendus détaillés d'un critère (US-143), affichés pendant la notation : cases à cocher, résumé
 * annoncé en direct. La valeur part avec le formulaire (`checks_<critère>`), les points restent
 * saisis librement (jamais déduits des cases).
 */
export function CriterionExpectations({
  criterionId,
  label,
  items,
  value,
  onChange,
}: {
  criterionId: string;
  label: string;
  items: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const uid = useId();
  const checked = parseChecks(value, items.length);
  return (
    <fieldset className="space-y-1 rounded-md border p-2">
      <legend className="px-1 text-xs font-medium">Attendus — {label}</legend>
      <input type="hidden" name={`checks_${criterionId}`} value={serializeChecks(checked)} />
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i}>
            <label className="flex min-h-9 items-start gap-2 text-sm">
              <input
                id={`${uid}-${i}`}
                type="checkbox"
                className="mt-1"
                checked={checked.includes(i)}
                onChange={() => onChange(serializeChecks(toggleCheck(checked, i)))}
              />
              {item}
            </label>
          </li>
        ))}
      </ul>
      <p role="status" aria-live="polite" className="text-muted-foreground text-xs">
        {checksSummary(checked.length, items.length)}
      </p>
    </fieldset>
  );
}
