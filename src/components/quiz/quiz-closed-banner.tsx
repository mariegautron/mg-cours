import { openQuizNow } from "@/app/(app)/modules/[id]/assessments/[assessmentId]/quiz/actions";
import { Button } from "@/components/ui/button";
import type { QuizAccess } from "@/lib/quiz/open-state";

/** Bandeau rouge quand le QR mènerait à « pas encore ouvert », avec « Ouvrir maintenant ». */
export function QuizClosedBanner({
  access,
  moduleId,
  assessmentId,
  back,
  large = false,
}: {
  access: QuizAccess;
  moduleId: string;
  assessmentId: string;
  back: "links" | "present";
  /** Sur la projection : en gros, pour que Marie le voie de loin. */
  large?: boolean;
}) {
  if (access.open) return null;
  return (
    <div
      role="alert"
      className={`border-destructive bg-destructive/10 text-destructive flex flex-wrap items-center gap-3 rounded-xl border-2 p-4 font-semibold ${large ? "text-2xl" : "text-sm"}`}
    >
      <span className="min-w-0 flex-1">{access.message}</span>
      {access.reason !== "closed" ? (
        <form action={openQuizNow.bind(null, moduleId, assessmentId, back)}>
          <Button type="submit" size={large ? "lg" : "touch"} variant="destructive">
            Ouvrir maintenant
          </Button>
        </form>
      ) : null}
    </div>
  );
}
