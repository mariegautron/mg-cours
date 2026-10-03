import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CriterionComparison } from "@/components/assessments/criterion-comparison";
import { Button } from "@/components/ui/button";
import { parseCriterionComments } from "@/lib/assessments/feedback";
import { getAssessment, getGradesByAssessment } from "@/lib/assessments/queries";
import { scoredCount } from "@/lib/assessments/overview";
import { gradingTargets } from "@/lib/assessments/targets";

export const metadata: Metadata = { title: "Comparer un critère" };

/**
 * Comparer un critère entre les copies (US-141) : une page à part, pour ne pas mélanger cette
 * édition en place avec les formulaires de copie (leurs saisies en cours ne seraient plus à jour).
 */
export default async function CompareCriterionPage({
  params,
  searchParams,
}: PageProps<"/modules/[id]/assessments/[assessmentId]/compare">) {
  const { id, assessmentId } = await params;
  const { critere } = await searchParams;
  const [assessment, grades] = await Promise.all([
    getAssessment(assessmentId),
    getGradesByAssessment(assessmentId),
  ]);
  if (!assessment || assessment.module_id !== id) notFound();

  const back = `/modules/${id}/assessments/${assessmentId}`;
  const autoValidated = assessment.auto_validated_criterion_ids;
  const criteria = (assessment.grading_grid?.criteria ?? []).filter(
    (c) => c.is_bonus || !autoValidated.includes(c.id),
  );
  const targets = gradingTargets(assessment.is_group_grade, assessment.groups);
  const copies = assessment.is_group_grade
    ? targets.map(({ group }) => ({
        id: group.id,
        kind: "group" as const,
        title: group.name,
        grade: grades.find((g) => g.student_group_id === group.id),
      }))
    : targets.flatMap(({ students }) =>
        students.map((s) => ({
          id: s.id,
          kind: "student" as const,
          title: `${s.first_name} ${s.last_name}`,
          grade: grades.find((g) => g.student_id === s.id),
        })),
      );

  const selected =
    criteria.find((c) => c.id === (typeof critere === "string" ? critere : "")) ?? criteria[0];

  const following = selected ? criteria[criteria.indexOf(selected) + 1] : undefined;

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-primary text-xs font-bold tracking-widest uppercase">Évaluations</p>
          <h1 className="text-3xl font-semibold">
            Comparer un critère entre les {assessment.is_group_grade ? "groupes" : "étudiant·es"}
          </h1>
          <p className="text-muted-foreground">
            {assessment.title} : tous les {assessment.is_group_grade ? "groupes" : "étudiant·es"}{" "}
            côte à côte, tu harmonises les notes et les commentaires pour les mêmes erreurs.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={back}>← Vue d’ensemble</Link>
        </Button>
      </div>

      {!selected ? (
        <p className="text-muted-foreground">
          Cette évaluation n’a pas de critère à comparer : choisis une grille dans « Modifier ».
        </p>
      ) : (
        <>
          <nav aria-label="Critères">
            <ul className="flex flex-wrap gap-2">
              {criteria.map((c) => {
                const noted = copies.filter(
                  (copy) => scoredCount(copy.grade?.scores, [c.id], autoValidated) > 0,
                ).length;
                const current = c.id === selected.id;
                return (
                  <li key={c.id}>
                    <Button asChild size="touch" variant={current ? "default" : "outline"}>
                      <Link
                        href={`${back}/compare?critere=${c.id}`}
                        aria-current={current ? "true" : undefined}
                      >
                        {c.label} · {noted}/{copies.length}
                      </Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <CriterionComparison
            key={selected.id}
            moduleId={id}
            assessmentId={assessmentId}
            criterion={{
              id: selected.id,
              label: selected.label,
              weight: selected.weight,
              levels: selected.levels.map((l) => ({
                points: l.points,
                description: l.description,
              })),
            }}
            copies={copies.map((copy) => {
              const raw = (copy.grade?.scores ?? {}) as Record<string, unknown>;
              const v = raw[selected.id];
              return {
                id: copy.id,
                kind: copy.kind,
                title: copy.title,
                points: typeof v === "number" ? v : null,
                comment: parseCriterionComments(copy.grade?.criterion_comments)[selected.id] ?? "",
                absent:
                  copy.kind === "student" && (copy.grade?.attendance ?? "present") !== "present",
              };
            })}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button asChild variant="secondary" size="touch">
              <Link href={back}>Terminer ce critère</Link>
            </Button>
            {following ? (
              <Button asChild variant="ghost" size="touch">
                <Link href={`${back}/compare?critere=${following.id}`}>
                  Passer au critère « {following.label} » →
                </Link>
              </Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
