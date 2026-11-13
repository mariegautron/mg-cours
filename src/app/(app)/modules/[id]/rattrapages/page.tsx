import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { CopyMessage } from "@/components/assessments/copy-message";
import { Status } from "@/components/dashboard/pill";
import { MakeupPanel } from "@/components/assessments/makeup-panel";
import { Button } from "@/components/ui/button";
import { makeupRowStatus, makeupSummary } from "@/lib/assessments/makeup-overview";
import { getModule } from "@/lib/modules/queries";
import { loadMakeupGroups } from "@/lib/assessments/makeup-queries";
import { createClient } from "@/lib/supabase/server";
import { listModuleAssessments } from "@/lib/assessments/queries";
import { MakeupDateForm } from "@/components/assessments/makeup-date-form";

export const metadata: Metadata = { title: "Rattrapages" };

/** Rattrapages du module (US-148) : qui est à rattraper, où en est chacun·e, et les gestes pour avancer. */
export default async function MakeupsPage({
  params,
  searchParams,
}: PageProps<"/modules/[id]/rattrapages">) {
  const { id } = await params;
  const sp = await searchParams;
  const created = typeof sp.cree === "string" ? sp.cree : null;
  const createdQcm = sp.qcm === "1";
  const added = typeof sp.ajout === "string" ? Number(sp.ajout) || 0 : null;
  const mod = await getModule(id);
  if (!mod) notFound();

  // Même calcul que le tableau de bord et la fiche du module.
  const groups = await loadMakeupGroups(id);
  const moduleAssessments = await listModuleAssessments(id);
  const dateOf = new Map(moduleAssessments.map((a) => [a.id, a.date]));
  const maxOf = new Map(moduleAssessments.map((a) => [a.id, a.maxScore]));
  // « Note remplacée : 0/4 » : la note obtenue au rattrapage.
  const makeupIds = groups.flatMap((g) => (g.makeup ? [g.makeup.id] : []));
  const supabase = await createClient();
  const { data: makeupGrades } = makeupIds.length
    ? await supabase
        .from("grade")
        .select("assessment_id, student_id, value")
        .in("assessment_id", makeupIds)
    : { data: [] as { assessment_id: string; student_id: string | null; value: number | null }[] };
  const makeupValue = (makeupId: string, studentId: string) =>
    (makeupGrades ?? []).find((x) => x.assessment_id === makeupId && x.student_id === studentId)
      ?.value ?? null;

  const toOrganise = groups.flatMap((g) =>
    g.rows.filter((r) => r.step !== "done").map((r) => ({ title: g.assessment.title, row: r })),
  );

  return (
    <div className="max-w-6xl space-y-5">
      {created ? (
        <div role="status" className="border-status-ready bg-muted space-y-1 rounded-xl border p-4">
          <p className="font-semibold">
            {added !== null
              ? `${added} personne${added > 1 ? "s" : ""} ajoutée${added > 1 ? "s" : ""} au rattrapage.`
              : "Rattrapage créé."}
          </p>
          <p className="flex flex-wrap gap-3 text-sm">
            <Link
              href={`/modules/${id}/assessments/${created}/edit`}
              className="underline underline-offset-2"
            >
              Modifier le sujet
            </Link>
            {createdQcm ? (
              <Link
                href={`/modules/${id}/assessments/${created}/quiz/links`}
                className="underline underline-offset-2"
              >
                Donner le lien
              </Link>
            ) : null}
          </p>
        </div>
      ) : null}
      <div className="space-y-1">
        <h1>Rattrapages</h1>
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
                  <h2 id={`mk-${g.assessment.id}`} className="text-sm font-semibold">
                    {g.rows.every((r) => r.step === "done") ? "Rattrapages faits" : "À rattraper"} :{" "}
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
                    <li key={r.student.id} className="flex flex-wrap items-center gap-3 py-2.5">
                      <span
                        aria-hidden
                        className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
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
                      {/* Statut clair : pas encore passé / rendu, à corriger / noté. */}
                      <Status state={makeupRowStatus(r).state}>
                        {makeupRowStatus(r).label}
                        {r.step === "done" &&
                        g.makeup &&
                        makeupValue(g.makeup.id, r.student.id) !== null
                          ? ` : ${makeupValue(g.makeup.id, r.student.id)!.toLocaleString("fr-FR")}/${maxOf.get(g.makeup.id) ?? 20}`
                          : ""}
                      </Status>
                      {g.makeup && r.step === "to_grade" ? (
                        <Link
                          href={`/modules/${id}/assessments/${g.makeup.id}/correct`}
                          className="text-primary text-sm underline underline-offset-2"
                        >
                          {r.taken ? "Corriger" : "Saisir la note"}
                          <span className="sr-only"> de {r.student.name}</span>
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
                {g.makeup ? (
                  <MakeupDateForm
                    moduleId={id}
                    makeupId={g.makeup.id}
                    initial={dateOf.get(g.makeup.id) ?? null}
                    who={g.rows.map((r) => r.student.name.split(" ")[0]).join(", ")}
                  />
                ) : null}
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
            <h2 id="rg" className="text-sm font-semibold">
              Règles appliquées
            </h2>
            <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
              <li>
                Rattrapage <strong className="text-foreground">individuel seulement</strong>.
              </li>
              <li>Absent·e non prévenu·e : 0, sans rattrapage.</li>
              <li>
                Sur un travail de groupe : la personne excusée garde la note du groupe, sans
                rattrapage.
              </li>
            </ul>
          </section>
          {toOrganise.length > 0 ? (
            <section
              aria-labelledby="pr"
              className="bg-primary/10 border-primary/50 space-y-2 rounded-xl border p-5"
            >
              <h2 id="pr" className="text-sm font-semibold">
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
