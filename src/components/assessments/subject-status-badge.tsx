"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { setAssessmentPrepStatus } from "@/app/(app)/modules/[id]/frise/actions";
import { Pill } from "@/components/dashboard/pill";
import { Button } from "@/components/ui/button";
import { PREP_STATUS_LABELS, type PrepStatus } from "@/lib/assessments/subject";

/**
 * État du sujet, visible et modifiable d'un clic : « À construire » → « Prête », et retour possible.
 * Le sujet reste modifiable ensuite.
 */
export function SubjectStatusBadge({
  moduleId,
  assessmentId,
  title,
  status,
}: {
  moduleId: string;
  assessmentId: string;
  title: string;
  status: PrepStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const change = (next: PrepStatus) =>
    start(async () => {
      const res = await setAssessmentPrepStatus(moduleId, assessmentId, next);
      if (res.error) setError(res.error);
      else {
        setError(null);
        router.refresh();
      }
    });

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Pill tone={status === "to_build" ? "warn" : "ok"}>
        <span className="sr-only">Sujet : </span>
        {PREP_STATUS_LABELS[status]}
      </Pill>
      {status === "to_build" ? (
        <Button type="button" size="sm" disabled={pending} onClick={() => change("ready")}>
          Passer en « Prête »<span className="sr-only"> : {title}</span>
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => change("to_build")}
        >
          Remettre « À construire »<span className="sr-only"> : {title}</span>
        </Button>
      )}
      {error ? (
        <span role="alert" className="text-destructive text-sm">
          {error}
        </span>
      ) : null}
    </span>
  );
}
