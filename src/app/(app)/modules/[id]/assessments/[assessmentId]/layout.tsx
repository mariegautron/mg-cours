import { ProjectionGuard } from "@/components/assessments/projection-guard";

/**
 * Tout ce qui touche à la correction d'une évaluation (notes, lettres, observations, résultats)
 * reste sur le portable : une fenêtre de projection n'y affiche qu'un message.
 */
export default function AssessmentLayout({ children }: { children: React.ReactNode }) {
  return <ProjectionGuard home="/dashboard">{children}</ProjectionGuard>;
}
