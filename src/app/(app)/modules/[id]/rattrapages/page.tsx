import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { MakeupPanel } from "@/components/assessments/makeup-panel";
import { Button } from "@/components/ui/button";
import {
  MAKEUP_STEP_LABELS,
  makeupOverview,
  makeupSummary,
} from "@/lib/assessments/makeup-overview";
import { listModuleAssessments } from "@/lib/assessments/queries";
import { getModule } from "@/lib/modules/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Rattrapages" };

/** Rattrapages du module (US-148) : qui est à rattraper, où en est chacun·e, et les gestes pour avancer. */
export default async function MakeupsPage({ params }: PageProps<"/modules/[id]/rattrapages">) {
  const { id } = await params;
  const mod = await getModule(id);
  if (!mod) notFound();

  const supabase = await createClient();
  const assessments = await listModuleAssessments(id);
  const ids = assessments.map((a) => a.id);
  const makeupIds = assessments.filter((a) => a.makeup_of_id).map((a) => a.id);
  const [{ data: grades }, { data: enrolledRows }, { data: students }] = await Promise.all([
    ids.length
      ? supabase
          .from("grade")
          .select("assessment_id, student_id, attendance, value")
          .in("assessment_id", ids)
      : Promise.resolve({ data: [] as never[] }),
    makeupIds.length
      ? supabase
          .from("assessment_student")
          .select("assessment_id, student_id")
          .in("assessment_id", makeupIds)
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("student").select("id, first_name, last_name"),
  ]);

  const enrolled = new Map<string, string[]>();
  for (const r of (enrolledRows ?? []) as { assessment_id: string; student_id: string }[]) {
    enrolled.set(r.assessment_id, [...(enrolled.get(r.assessment_id) ?? []), r.student_id]);
  }
  const groups = makeupOverview({
    assessments,
    grades: (grades ?? []) as never,
    enrolled,
    studentNames: new Map(
      (students ?? []).map((s) => [s.id, `${s.first_name} ${s.last_name}`] as const),
    ),
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Rattrapages — {mod.name}</h1>
        <p role="status" className="text-muted-foreground">
          {makeupSummary(groups)} Un rattrapage ne concerne que les évaluations individuelles : sa
          note remplace l’absence excusée dans les moyennes.
        </p>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="Personne à rattraper"
          description="Quand une personne est absente excusée à une évaluation individuelle, elle apparaît ici."
          actions={[{ label: "Voir les évaluations", href: `/modules/${id}/assessments` }]}
        />
      ) : (
        groups.map((g) => (
          <section
            key={g.assessment.id}
            aria-labelledby={`mk-${g.assessment.id}`}
            className="space-y-3 rounded-lg border p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id={`mk-${g.assessment.id}`} className="text-lg font-medium">
                {g.assessment.title}
              </h2>
              <Button asChild size="touch" variant="outline">
                <Link href={`/modules/${id}/assessments/${g.assessment.id}`}>
                  Ouvrir l’évaluation
                </Link>
              </Button>
            </div>
            <ul className="divide-y text-sm">
              {g.rows.map((r) => (
                <li
                  key={r.student.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <span className="font-medium">{r.student.name}</span>
                  <span>{MAKEUP_STEP_LABELS[r.step]}</span>
                </li>
              ))}
            </ul>
            <MakeupPanel
              moduleId={id}
              assessmentId={g.assessment.id}
              excused={g.rows.map((r) => r.student.name)}
              makeup={
                g.makeup
                  ? {
                      ...g.makeup,
                      enrolled: g.rows.filter((r) => r.step === "to_grade" || r.step === "done")
                        .length,
                    }
                  : null
              }
            />
          </section>
        ))
      )}
    </div>
  );
}
