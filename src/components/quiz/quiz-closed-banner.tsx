import { openQuizNow } from "@/app/(app)/modules/[id]/assessments/[assessmentId]/quiz/actions";
import { Button } from "@/components/ui/button";
import type { QuizAccess } from "@/lib/quiz/open-state";

/** Bandeau quand le QR mènerait à « pas encore ouvert », avec « Ouvrir maintenant » (neutre si l'ouverture est simplement programmée). */
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
  // Ouverture programmée (« pas encore ouvert : ouverture le 27/11 à 13 h ») : situation normale,
  // simple information en couleur neutre. Le rouge reste pour un QCM fermé ou non publié.
  const info = access.reason === "not_yet";
  return (
    <div
      role={info ? "status" : "alert"}
      className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 ${
        info
          ? "bg-muted text-foreground font-medium"
          : "border-destructive bg-destructive/10 text-destructive border-2 font-semibold"
      } ${large ? "text-2xl" : "text-sm"}`}
    >
      <span className="min-w-0 flex-1">{access.message}</span>
      {access.reason !== "closed" ? (
        <form action={openQuizNow.bind(null, moduleId, assessmentId, back)}>
          <Button
            type="submit"
            size={large ? "lg" : "touch"}
            variant={info ? "secondary" : "destructive"}
          >
            Ouvrir maintenant
          </Button>
        </form>
      ) : null}
    </div>
  );
}
