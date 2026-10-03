import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";

import { OutlineActions } from "@/components/modules/outline-actions";
import { Button } from "@/components/ui/button";
import { listModuleAssessments } from "@/lib/assessments/queries";
import { getModuleCoverage } from "@/lib/modules/coverage-queries";
import { deadlineBanner, outlineChecks } from "@/lib/modules/outline-checks";
import {
  getModule,
  getModuleCourses,
  getModuleDocuments,
  getModuleExpectations,
  getRetainedResources,
} from "@/lib/modules/queries";
import { getOutline } from "@/lib/outline/queries";
import { trameStatus } from "@/lib/ynov/trame";

export const metadata: Metadata = { title: "Progression pédagogique" };

const fr = (iso: string | Date) => new Date(iso).toLocaleDateString("fr-FR");

export default async function ModuleOutlinePage({ params }: PageProps<"/modules/[id]/outline">) {
  const { id } = await params;
  const [mod, documents, expectations, outline, courses, assessments, retained] = await Promise.all(
    [
      getModule(id),
      getModuleDocuments(id),
      getModuleExpectations(id),
      getOutline(id),
      getModuleCourses(id),
      listModuleAssessments(id),
      getRetainedResources(id),
    ],
  );
  if (!mod) notFound();
  const coverage = await getModuleCoverage(id, expectations, retained);

  const trame = trameStatus(mod.first_session_date, mod.iceberg_state);
  const depositedOutline = documents.find((d) => d.kind === "outline_sent") ?? null;
  const banner = deadlineBanner(
    trame.level,
    trame.daysUntilDue,
    trame.dueDate ? fr(trame.dueDate) : null,
  );

  const regular = assessments.filter((a) => !a.makeup_of_id);
  const checks = outlineChecks({
    courses: courses.map((c) => ({
      position: c.position,
      title: c.title,
      sessionDate: c.session_date,
      startTime: c.start_time,
      endTime: c.end_time,
      objectives: c.learning_objectives ?? [],
      contentUpdatedAt: c.content_last_updated_at,
    })),
    moduleHours: mod.total_hours,
    assessments: { total: regular.length, linked: regular.filter((a) => a.course_id).length },
    expectations: {
      total: expectations.length,
      uncovered: coverage.uncovered,
      objectives: expectations.filter((e) => e.kind === "objective").length,
      units: expectations.filter((e) => e.kind === "unit").length,
    },
  });
  const todo = checks.filter((c) => !c.ok).length;

  const generatedLabel =
    outline && depositedOutline
      ? `Progression générée depuis les séances le ${fr(outline.generated_at)} (brouillon, non envoyée).`
      : outline
        ? `Générée le ${fr(outline.generated_at)}${outline.sent_at ? ` · envoyée le ${fr(outline.sent_at)}` : ""}${
            outline.validated_at ? ` · validée le ${fr(outline.validated_at)}` : ""
          }.`
        : null;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-primary mb-1.5 text-xs font-bold tracking-widest uppercase">
            Documents
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Progression pédagogique
          </h1>
          <p className="text-muted-foreground mt-1">
            Vérifie que tout est prêt, génère le PDF, envoie-le à l’école, puis dis-le-moi.
          </p>
        </div>
        <Button asChild variant="ghost">
          <Link href={`/modules/${mod.id}`}>← Retour au module</Link>
        </Button>
      </div>

      {banner ? (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3.5 ${
            banner.tone === "warn" ? "border-sun/45 bg-sun/12" : "bg-card"
          }`}
        >
          <strong>{banner.strong}</strong> <span>{banner.rest}</span>
        </div>
      ) : (
        <div role="status" className="border-mint/45 bg-mint/12 rounded-2xl border px-4 py-3.5">
          <strong>Progression pédagogique envoyée.</strong>{" "}
          <span>
            {outline?.sent_at
              ? `Envoyée le ${fr(outline.sent_at)}. `
              : depositedOutline
                ? `PDF déposé le ${fr(depositedOutline.created_at)}. `
                : ""}
            Les rappels J-15 et J-7 sont arrêtés.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-start gap-5 lg:flex-nowrap">
        <section
          aria-labelledby="ver"
          className="bg-card w-full min-w-0 rounded-3xl border p-5 shadow-sm lg:w-[35rem] lg:flex-none"
        >
          <h2 id="ver" className="font-heading mb-1 text-xl font-bold">
            Avant de générer
          </h2>
          <p className="text-muted-foreground mb-2 text-sm">
            {todo === 0
              ? "Tout est prêt."
              : `${todo} point${todo > 1 ? "s" : ""} à voir : rien ne t’empêche de générer quand même.`}
          </p>
          <ul>
            {checks.map((c) => (
              <li key={c.key} className="flex items-start gap-3 border-t py-2.5">
                <span
                  aria-hidden
                  className={`mt-0.5 flex size-6 flex-none items-center justify-center rounded-full text-[0.8rem] font-bold ${
                    c.ok ? "bg-mint text-background" : "border-sun text-sun border-[1.5px]"
                  }`}
                >
                  {c.ok ? <Check className="size-3.5" strokeWidth={3} /> : "!"}
                </span>
                <div className="min-w-0 flex-1">
                  <strong>{c.title}</strong>
                  <span className="sr-only">{c.ok ? " : prêt" : " : à voir"}</span>
                  {c.detail || c.to ? (
                    <div className="text-muted-foreground text-sm">
                      {c.detail}
                      {c.detail && c.to ? " · " : ""}
                      {c.to ? (
                        <Link
                          href={`/modules/${mod.id}${c.to}`}
                          className="text-primary underline underline-offset-2"
                        >
                          {c.toLabel}
                        </Link>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="w-full min-w-0 flex-1 lg:basis-0">
          <OutlineActions
            moduleId={mod.id}
            status={outline?.status ?? null}
            hasDepositedOutline={!!depositedOutline}
            archived={!!mod.archived_at}
            generatedLabel={generatedLabel}
            deposited={
              depositedOutline
                ? { id: depositedOutline.id, date: fr(depositedOutline.created_at) }
                : null
            }
          />
        </div>
      </div>
    </div>
  );
}
