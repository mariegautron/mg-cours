import Link from "next/link";

import {
  acceptLateAnswers,
  forceSubmit,
  redrawAttempt,
  reopenAttempt,
  revokeLink,
  setTimeMultiplier,
} from "@/app/(app)/modules/[id]/assessments/[assessmentId]/quiz/actions";
import { RegenerateLink } from "@/components/quiz/links-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AttemptSummary } from "@/lib/quiz/queries";

/** Actions de Marie sur une copie, selon son état (formulaires simples : fonctionnent sans JavaScript). */
export function AttemptActions({
  moduleId,
  assessmentId,
  attempt,
  quizClosed,
}: {
  moduleId: string;
  assessmentId: string;
  attempt: AttemptSummary;
  quizClosed: boolean;
}) {
  const a = attempt;
  const bind = <F extends (m: string, s: string, id: string, ...r: never[]) => unknown>(fn: F) =>
    (fn as unknown as (m: string, s: string, id: string) => Promise<void>).bind(
      null,
      moduleId,
      assessmentId,
      a.id,
    );
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {a.status === "submitted" ? (
          <Button asChild size="sm" variant="secondary">
            <Link href={`/modules/${moduleId}/assessments/${assessmentId}/quiz/attempts/${a.id}`}>
              {a.reviewComplete ? "Voir la copie" : "Relire la copie"}
              <span className="sr-only"> de {a.name}</span>
            </Link>
          </Button>
        ) : null}
        {a.status === "in_progress" ? (
          <form action={bind(forceSubmit)}>
            <Button type="submit" size="sm" variant="secondary">
              Rendre la copie<span className="sr-only"> de {a.name}</span>
            </Button>
          </form>
        ) : null}
        {a.status === "ready" && !a.revoked ? (
          <form action={bind(redrawAttempt)}>
            <Button type="submit" size="sm" variant="secondary">
              Refaire le tirage<span className="sr-only"> de {a.name}</span>
            </Button>
          </form>
        ) : null}
        {a.status !== "submitted" && !a.revoked ? (
          <form action={bind(revokeLink)}>
            <Button type="submit" size="sm" variant="ghost">
              Révoquer le lien<span className="sr-only"> de {a.name}</span>
            </Button>
          </form>
        ) : null}
        {a.hasLateAnswers ? (
          <form action={bind(acceptLateAnswers)}>
            <Button type="submit" size="sm" variant="secondary">
              Prendre en compte les modifications tardives
              <span className="sr-only"> de {a.name}</span>
            </Button>
          </form>
        ) : null}
      </div>
      {a.status !== "submitted" ? (
        <RegenerateLink
          moduleId={moduleId}
          assessmentId={assessmentId}
          attemptId={a.id}
          name={a.name}
          hasEmail={!!a.email}
        />
      ) : null}
      {a.status === "submitted" && !quizClosed ? (
        <form action={bind(reopenAttempt)} className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor={`minutes-${a.id}`} className="text-xs">
              Rouvrir pour (minutes)
            </Label>
            <Input
              id={`minutes-${a.id}`}
              name="minutes"
              inputMode="numeric"
              defaultValue="15"
              className="h-8 w-20"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary">
            Rouvrir la copie<span className="sr-only"> de {a.name}</span>
          </Button>
        </form>
      ) : null}
      {a.status !== "submitted" ? (
        <form action={bind(setTimeMultiplier)} className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor={`mult-${a.id}`} className="text-xs">
              Tiers-temps (×)
            </Label>
            <Input
              id={`mult-${a.id}`}
              name="multiplier"
              inputMode="decimal"
              defaultValue={String(a.timeMultiplier).replace(".", ",")}
              className="h-8 w-20"
            />
          </div>
          <Button type="submit" size="sm" variant="ghost">
            Appliquer<span className="sr-only"> à {a.name}</span>
          </Button>
        </form>
      ) : null}
    </div>
  );
}
