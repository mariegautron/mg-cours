"use client";

import { useState, useTransition } from "react";

import { setCourseExpectations } from "@/app/(app)/modules/[id]/courses/actions";

/** « Attendus traités » : cases à cocher parmi les attendus du module, enregistrées sur place. */
export function CourseExpectationsPicker({
  moduleId,
  courseId,
  expectations,
  initial,
  suggested = [],
}: {
  /** Reliés à une ressource du déroulé : proposés, jamais cochés d'office. */
  suggested?: string[];
  moduleId: string;
  courseId: string;
  expectations: { id: string; label: string }[];
  initial: string[];
}) {
  const [chosen, setChosen] = useState(new Set(initial));
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  function toggle(id: string) {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChosen(next);
    start(async () => {
      const res = await setCourseExpectations(moduleId, courseId, [...next]);
      setMessage(res.error ?? "Attendus de la séance enregistrés.");
    });
  }

  if (expectations.length === 0)
    return <p className="text-muted-foreground text-sm">Aucun attendu dans ce module.</p>;
  return (
    <fieldset className="space-y-1.5">
      <legend className="sr-only">Attendus traités dans cette séance</legend>
      {expectations.map((e) => (
        <label key={e.id} className="flex min-h-9 items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-4"
            checked={chosen.has(e.id)}
            disabled={pending}
            onChange={() => toggle(e.id)}
          />
          <span>
            {e.label}
            {suggested.includes(e.id) && !chosen.has(e.id) ? (
              <span className="text-primary block text-xs font-semibold">
                Proposé : relié à une ressource du déroulé
              </span>
            ) : null}
          </span>
        </label>
      ))}
      <p role="status" className="text-muted-foreground min-h-5 text-xs">
        {message}
      </p>
    </fieldset>
  );
}
