import type { Metadata } from "next";
import { isOutlineSent } from "@/lib/modules/outline-sent";
import Link from "next/link";

import { parisLongDateTime } from "@/lib/deposits/rules";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";

import { OutlineActions } from "@/components/modules/outline-actions";
import { Button } from "@/components/ui/button";
import { listModuleAssessments } from "@/lib/assessments/queries";
import { getExpectationCoverageView } from "@/lib/modules/expectation-coverage-queries";
import { deadlineBanner, outlineChecks } from "@/lib/modules/outline-checks";
import {
  getModule,
  getModuleCourses,
  getModuleDocuments,
  getModuleExpectations,
} from "@/lib/modules/queries";
import { publishableText, suspectLines } from "@/lib/ynov/private-text";
import { getOutline } from "@/lib/outline/queries";
import { trameStatus } from "@/lib/ynov/trame";

export const metadata: Metadata = { title: "Progression pédagogique" };

const fr = (iso: string | Date) => new Date(iso).toLocaleDateString("fr-FR");

/** Ce qui sera publié pour une séance : modalités, évaluation, lignes privées retirées ou suspectes. */
function publicationInfo(
  c: {
    id: string;
    animation_notes: string | null;
    assessment_notes: string | null;
    material: string | null;
  },
  assessments: { course_id: string | null }[],
) {
  const animation = publishableText(c.animation_notes);
  const note = publishableText(c.assessment_notes);
  const material = publishableText(c.material);
  const linked = assessments.some((a) => a.course_id === c.id);
  return {
    animation: animation.text || null,
    hasEvaluation: linked || note.text.length > 0,
    removedLines: animation.removed + note.removed + material.removed,
    suspectLines: [animation.text, note.text, material.text].flatMap((t) => suspectLines(t)),
  };
}

export default async function ModuleOutlinePage({ params }: PageProps<"/modules/[id]/outline">) {
  const { id } = await params;
  const [mod, documents, expectations, outline, courses, assessments] = await Promise.all([
    getModule(id),
    getModuleDocuments(id),
    getModuleExpectations(id),
    getOutline(id),
    getModuleCourses(id),
    listModuleAssessments(id),
  ]);
  if (!mod) notFound();
  // Même calcul que la page Couverture et que le PDF : séances et évaluations (pas les ressources).
  const expectationCoverage = await getExpectationCoverageView(id);

  const trame = trameStatus(
    mod.first_session_date,
    mod.iceberg_state,
    new Date(),
    isOutlineSent({ outline, documents, adminDocs: mod.admin_docs }),
  );
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
      ...publicationInfo(c, regular),
    })),
    moduleHours: mod.total_hours,
    assessments: { total: regular.length, linked: regular.filter((a) => a.course_id).length },
    expectations: {
      total: expectations.length,
      uncovered: expectationCoverage.summary.byNone,
      objectives: expectations.filter((e) => e.kind === "objective").length,
      units: expectations.filter((e) => e.kind === "unit").length,
    },
  });
  // Évaluation reprise d'un autre module, pas encore relue : son sujet partirait tel quel.
  const toReread = regular.filter((a) => a.needs_review);
  if (toReread.length)
    checks.push({
      key: "reprise",
      ok: false,
      title: `${toReread.length} évaluation${toReread.length > 1 ? "s" : ""} reprise${toReread.length > 1 ? "s" : ""} d’un autre module, à relire`,
      detail: toReread.map((a) => a.title).join(", "),
      to: `/assessments/${toReread[0].id}/edit`,
      toLabel: "Relire",
    });
  const todo = checks.filter((c) => !c.ok).length;

  const generatedLabel =
    outline && depositedOutline
      ? `Progression générée depuis les séances le ${fr(outline.generated_at)} (brouillon, non envoyée).`
      : outline
        ? `Générée le ${parisLongDateTime(outline.generated_at)}${outline.sent_at ? ` · envoyée le ${parisLongDateTime(outline.sent_at)}` : ""}${
            outline.validated_at ? ` · validée le ${parisLongDateTime(outline.validated_at)}` : ""
          }.`
        : null;

  return (
    <div className="mx-auto max-w-[112rem] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground mb-1.5 text-[0.8125rem] font-medium">Documents</p>
          <h1>Progression pédagogique</h1>
          <p className="text-muted-foreground mt-1">
            Vérifie que tout est prêt, génère le PDF, envoie-le à l’école, puis dis-le-moi.
          </p>
        </div>
      </div>

      {banner ? (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3.5 ${
            banner.tone === "warn" ? "border-status-todo bg-muted" : "bg-card"
          }`}
        >
          <strong>{banner.strong}</strong> <span>{banner.rest}</span>
        </div>
      ) : (
        <div role="status" className="border-status-ready bg-muted rounded-xl border px-4 py-3.5">
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

      {/* 2 colonnes seulement avec assez de place (≥ 1 200 px utiles), sinon 1 : pas de défilement horizontal. */}
      <div className="flex flex-wrap items-start gap-5 min-[1460px]:flex-nowrap">
        <section
          aria-labelledby="ver"
          className="bg-card w-full min-w-0 rounded-xl border p-4 min-[1460px]:w-[35rem] min-[1460px]:flex-none"
        >
          <h2 id="ver" className="mb-1 text-sm font-semibold">
            Avant de générer
          </h2>
          <p className="text-muted-foreground mb-2 text-sm">
            {todo === 0
              ? "Tout est prêt."
              : `${todo} point${todo > 1 ? "s" : ""} à voir : rien ne t’empêche de générer quand même.`}
          </p>
          <p className="text-muted-foreground mb-2 text-sm">
            La progression est remise à l’école : entoure d’un <code>[privé]</code> …{" "}
            <code>[/privé]</code> ce qui doit rester pour toi dans les notes de séance. Les lignes
            qui parlent de corrigé, de résultat attendu ou de « à faire verbaliser » ne sont jamais
            publiées.
          </p>
          <ul>
            {checks.map((c) => (
              <li key={c.key} className="flex items-start gap-3 border-t py-2.5">
                <span
                  aria-hidden
                  className={`mt-0.5 flex size-6 flex-none items-center justify-center rounded-full text-[0.8125rem] font-bold ${
                    c.ok
                      ? "bg-status-ready text-status-ink"
                      : "border-status-todo text-warning border-[1.5px]"
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

        <div className="w-full min-w-0 flex-1 space-y-4 min-[1460px]:basis-0">
          <OutlineActions
            moduleId={mod.id}
            status={outline?.status ?? null}
            hasDepositedOutline={!!depositedOutline}
            archived={!!mod.archived_at}
            generatedLabel={generatedLabel}
            sentVersion={
              outline?.pdf_path && outline.sent_at ? parisLongDateTime(outline.sent_at) : null
            }
            deposited={
              depositedOutline
                ? { id: depositedOutline.id, date: fr(depositedOutline.created_at) }
                : null
            }
          />
          {outline && !depositedOutline ? (
            // Aperçu du PDF (lot 3) : il s'ouvre dans un onglet, sans téléchargement. (Un aperçu
            // dans la page demande d'autoriser l'appli à s'afficher dans un cadre : voir DECISIONS-NUIT.)
            <section aria-labelledby="apercu" className="bg-card rounded-xl border p-4">
              <h2 id="apercu" className="text-sm font-semibold">
                Aperçu du PDF
              </h2>
              <p className="text-muted-foreground text-sm">
                {outline.generated_at
                  ? `Généré le ${parisLongDateTime(outline.generated_at)}.`
                  : "Pas encore généré."}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild variant="secondary">
                  <a
                    href={`/api/modules/${mod.id}/outline?inline=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Voir la progression
                    <span className="sr-only"> (PDF, nouvel onglet)</span>
                  </a>
                </Button>
                {outline.pdf_path && outline.sent_at ? (
                  <Button asChild variant="ghost">
                    <a
                      href={`/api/modules/${mod.id}/outline?version=envoyee&inline=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Voir la version envoyée le {parisLongDateTime(outline.sent_at)}
                      <span className="sr-only"> (PDF, nouvel onglet)</span>
                    </a>
                  </Button>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
