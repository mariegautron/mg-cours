import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { CopyMessage } from "@/components/assessments/copy-message";
import { Pill } from "@/components/dashboard/pill";
import { MakeupPanel } from "@/components/assessments/makeup-panel";
import { Button } from "@/components/ui/button";
import {
  MAKEUP_STEP_LABELS,
  makeupOverview,
  makeupSummary,
} from "@/lib/assessments/makeup-overview";
import { listModuleAssessments } from "@/lib/assessments/queries";
import { getModule } from "@/lib/modules/queries";
import { getAbsenceRuleForModule } from "@/lib/settings/rules-queries";
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

  const rule = await getAbsenceRuleForModule(id);
  const toOrganise = groups.flatMap((g) =>
    g.rows.filter((r) => r.step !== "done").map((r) => ({ title: g.assessment.title, row: r })),
  );

  return (
    <div className="max-w-6xl space-y-5">
      <div className="space-y-1">
        <p className="text-primary text-xs font-bold tracking-widest uppercase">Évaluations</p>
        <h1 className="text-3xl font-semibold">Rattrapages — {mod.name}</h1>
        <p role="status" className="text-muted-foreground">
          {makeupSummary(groups)} Un rattrapage ne concerne que les évaluations individuelles : sa
          note remplace l’absence excusée dans les moyennes.
        </p>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-[3_1_0] space-y-4">
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
                className="bg-card space-y-3 rounded-xl border p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 id={`mk-${g.assessment.id}`} className="text-lg font-semibold">
                    À rattraper : {g.assessment.title}
                  </h2>
                  <Button asChild size="touch" variant="outline">
                    <Link href={`/modules/${id}/assessments/${g.assessment.id}`}>
                      Ouvrir l’évaluation
                    </Link>
                  </Button>
                </div>
                <ul className="divide-y text-sm">
                  {g.rows.map((r) => (
                    <li key={r.student.id} className="flex flex-wrap items-center gap-3 py-2.5">
                      <span
                        aria-hidden
                        className="bg-primary/20 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      >
                        {r.student.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((w) => w.charAt(0).toUpperCase())
                          .join("")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <strong>{r.student.name}</strong>
                        <span className="text-muted-foreground block">
                          {g.assessment.title} · absence excusée
                        </span>
                      </span>
                      <Pill tone={r.step === "done" ? "ok" : "warn"}>
                        {MAKEUP_STEP_LABELS[r.step]}
                      </Pill>
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

        <div className="min-w-0 flex-[2_1_0] space-y-4">
          <section aria-labelledby="rg" className="bg-card space-y-2 rounded-xl border p-5">
            <h2 id="rg" className="text-lg font-semibold">
              Règles appliquées
            </h2>
            <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
              <li>
                Rattrapage <strong className="text-foreground">individuel seulement</strong>.
              </li>
              <li>Absent·e non prévenu·e : 0, sans rattrapage.</li>
              <li>
                Sur un travail de groupe :{" "}
                {rule === "makeup"
                  ? "la personne n’a pas de note jusqu’au rattrapage (réglage de l’école)."
                  : "la personne garde la note de groupe (réglage YNOV)."}
              </li>
            </ul>
            <Button asChild variant="ghost" size="touch">
              <Link href="/settings#school-rules">Changer le réglage de l’école</Link>
            </Button>
          </section>
          {toOrganise.length > 0 ? (
            <section
              aria-labelledby="pr"
              className="bg-primary/10 border-primary/50 space-y-2 rounded-xl border p-5"
            >
              <h2 id="pr" className="text-lg font-semibold">
                Prévenir {toOrganise.length > 1 ? "les personnes" : toOrganise[0].row.student.name}
              </h2>
              <p className="text-muted-foreground text-sm">
                Un message prêt à copier, rédigé au vouvoiement. Rien n’est envoyé par l’appli.
              </p>
              {toOrganise.map(({ title, row }) => (
                <CopyMessage
                  key={`${title}-${row.student.id}`}
                  label={`Copier le message pour ${row.student.name}`}
                  text={`Bonjour ${row.student.name.split(" ")[0]},\n\nVotre absence à « ${title} » est excusée : un travail de rattrapage est prévu, avec le même barème. Je vous communique très bientôt la date et les modalités.\n\nCordialement,\nMarie Gautron`}
                />
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
