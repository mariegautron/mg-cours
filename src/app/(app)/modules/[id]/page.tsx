import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Presentation } from "lucide-react";

import { Pill } from "@/components/dashboard/pill";
import { ArchiveModuleButton } from "@/components/modules/archive-module-button";
import { FinishModuleButton } from "@/components/modules/finish-module-button";
import { JourneyHero } from "@/components/modules/journey-hero";
import { JourneySteps } from "@/components/modules/journey-steps";
import { loadModuleMean } from "@/lib/dashboard/overview-queries";
import { daysBetween } from "@/lib/dashboard/todo";
import { formatSessionDay } from "@/lib/dashboard/today";
import { meanLabel } from "@/lib/dashboard/overview";
import { formatTimeRange } from "@/lib/modules/course-duration";
import { getModuleCoverage } from "@/lib/modules/coverage-queries";
import { ficheNotice } from "@/lib/modules/fiche-import";
import { buildHero } from "@/lib/modules/hero";
import { buildJourney } from "@/lib/modules/journey";
import { highlightedSession, todayInParis } from "@/lib/modules/next-session";
import {
  getModule,
  getModuleCourses,
  getModuleDocuments,
  getModuleExpectations,
  getRetainedResources,
} from "@/lib/modules/queries";
import { getRetrospectiveNote, retrospectiveAvailable } from "@/lib/modules/retrospective-queries";
import { schoolYearOf } from "@/lib/modules/list-state";
import { listModuleAssessments, moduleNoteProgress } from "@/lib/assessments/queries";
import { getInvoiceByModule, loadInvoiceContext } from "@/lib/invoice/queries";
import { getOutline } from "@/lib/outline/queries";
import { listModuleGroups } from "@/lib/students/queries";
import { trameStatus } from "@/lib/ynov/trame";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const mod = await getModule(id);
  return { title: mod?.name ?? "Module" };
}

const BTN =
  "focus-visible:ring-ring hover:bg-accent inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none";

const INVOICE_LABEL = {
  draft: "En préparation",
  ready: "Prête",
  sent: "Envoyée",
  paid: "Payée",
} as const;

function Card({
  id,
  title,
  children,
  aside,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="bg-card rounded-3xl border p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2.5">
        <h2 id={id} className="font-heading text-lg font-bold">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card rounded-2xl border p-3.5">
      <span className="text-muted-foreground block text-[0.8rem]">{label}</span>
      <b className="font-heading text-2xl">{value}</b>
    </div>
  );
}

export default async function ModulePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ fiche?: string }>;
}) {
  const { id } = await params;
  const ficheMessage = ficheNotice((await searchParams).fiche);
  const [
    mod,
    courses,
    groups,
    documents,
    retained,
    expectations,
    assessments,
    outline,
    invoiceCtx,
    invoice,
  ] = await Promise.all([
    getModule(id),
    getModuleCourses(id),
    listModuleGroups(id),
    getModuleDocuments(id),
    getRetainedResources(id),
    getModuleExpectations(id),
    listModuleAssessments(id),
    getOutline(id),
    loadInvoiceContext(id),
    getInvoiceByModule(id),
  ]);
  if (!mod) notFound();

  const today = todayInParis();
  const notes = await moduleNoteProgress(id, mod.total_hours, assessments);
  const trame = trameStatus(mod.first_session_date, mod.iceberg_state);
  const coverage = await getModuleCoverage(id, expectations, retained);
  const journey = buildJourney({
    mod,
    courses,
    documents,
    expectations,
    coverage,
    outline,
    assessments,
    notes,
    trame,
    invoice,
    invoiceCtx,
  });

  const closed = !!(mod.archived_at || mod.finished_at);
  const doneCourses = courses.filter(
    (c) => c.completion === "done" || c.completion === "partial",
  ).length;
  const readyCourses = courses.filter((c) => c.prep_status === "ready").length;
  const firstDated = courses.find((c) => c.session_date) ?? courses[0] ?? null;
  const hero = buildHero({
    moduleId: mod.id,
    journey,
    firstSessionDate: firstDated?.session_date ?? mod.first_session_date,
    firstCourse: courses[0] ? { id: courses[0].id, position: 1 } : null,
    courses: { total: courses.length, done: doneCourses },
    closed,
  });
  const askNote = hero?.offerFinish ? await retrospectiveAvailable() : false;
  const finishedView = hero?.kind === "finished";
  const upcoming = closed ? null : highlightedSession(courses, today);
  const planned = assessments.filter((a) => !a.makeup_of_id);
  const gridsReady = planned.filter((a) => a.grading_grid_id).length;
  const members = new Set(groups.flatMap((g) => g.members.map((m) => m.id)));
  const [mean, retro] = finishedView
    ? await Promise.all([loadModuleMean(id), getRetrospectiveNote(id)])
    : [[], null];
  const dueIn = trame.dueDate ? daysBetween(today, trame.dueDate.toISOString().slice(0, 10)) : null;
  const meta = [
    mod.school?.name ?? "École non renseignée",
    mod.level,
    mod.ycode ? `YCODE ${mod.ycode}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-primary mb-1.5 text-[0.75rem] font-bold tracking-widest uppercase">
            Module · {schoolYearOf(mod.year)}
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">{mod.name}</h1>
          <p className="text-muted-foreground mt-1.5">{meta}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Pill>{mod.total_hours} h</Pill>
          <Pill tone={notes.satisfied ? "ok" : "plain"}>
            {notes.enteredTotal} / {notes.requirement.total} notes
          </Pill>
          <Link href={`/present/modules/${mod.id}`} className={BTN}>
            <Presentation aria-hidden className="mr-2 size-4" />
            Présenter le module
          </Link>
          <Link href={`/modules/${mod.id}/edit`} className={BTN}>
            <Pencil aria-hidden className="mr-2 size-4" />
            Modifier
          </Link>
        </div>
      </header>

      {ficheMessage ? (
        <p
          role="status"
          className={
            ficheMessage.tone === "ok"
              ? "rounded-2xl border p-3 text-sm"
              : "border-destructive/50 rounded-2xl border p-3 text-sm"
          }
        >
          {ficheMessage.text}{" "}
          {ficheMessage.tone === "warn" ? (
            <Link href={`/modules/${mod.id}/expectations`} className="underline underline-offset-2">
              Ouvrir les attendus
            </Link>
          ) : null}
        </p>
      ) : null}

      {mod.archived_at ? (
        <p className="bg-muted rounded-2xl border border-dashed p-3 text-sm">
          <strong>Module rangé</strong> le {new Date(mod.archived_at).toLocaleDateString("fr-FR")} :
          il n’apparaît plus dans le tableau de bord ni dans la facturation. Tu peux le restaurer
          depuis la liste des modules.{" "}
          <ArchiveModuleButton id={mod.id} archived compact name={mod.name} />
        </p>
      ) : null}

      <div className="flex flex-wrap items-start gap-6 lg:flex-nowrap">
        <div className="min-w-0 flex-1 basis-full space-y-4 lg:basis-0">
          {hero ? (
            <JourneyHero hero={hero} moduleId={mod.id} moduleName={mod.name} askNote={askNote} />
          ) : null}
          <JourneySteps journey={journey} />
        </div>

        <div className="w-full min-w-0 space-y-4 lg:w-96 lg:flex-none">
          {finishedView ? (
            <>
              <Card id="bilan" title="Le bilan">
                <div className="grid grid-cols-2 gap-2.5">
                  <Stat label="Moyenne de la classe" value={meanLabel(mean) ?? "—"} />
                  <Stat label="Étudiant·es" value={String(members.size)} />
                  <Stat label="Heures faites" value={`${mod.total_hours} h`} />
                  <Stat label="Facture" value={invoice ? INVOICE_LABEL[invoice.status] : "—"} />
                </div>
              </Card>
              <Card id="retour" title="Ton retour" aside={<Pill tone="warn">Privé</Pill>}>
                {retro ? (
                  <p className="text-sm whitespace-pre-wrap">{retro}</p>
                ) : (
                  <p className="text-muted-foreground mb-3 text-sm">
                    Ce que tu retiens de ce module, à écrire avant de le terminer.
                  </p>
                )}
                {hero?.offerFinish ? (
                  <FinishModuleButton
                    id={mod.id}
                    name={mod.name}
                    askNote={askNote}
                    label="Écrire mon retour"
                  />
                ) : null}
              </Card>
              <Card id="consultable" title="Ce qui reste consultable">
                <p className="text-muted-foreground text-sm">
                  Notes, résultats publiés, observations, facture, fil rouge.
                </p>
              </Card>
            </>
          ) : (
            <>
              <Card id="avenir" title="À venir">
                {upcoming ? (
                  <>
                    <p>
                      <strong>{formatSessionDay(upcoming.course.session_date!)}</strong>
                      {formatTimeRange(upcoming.course.start_time, upcoming.course.end_time)
                        ? `, ${formatTimeRange(upcoming.course.start_time, upcoming.course.end_time)}`
                        : ""}
                    </p>
                    <p className="text-muted-foreground mb-3">
                      Séance {upcoming.number} sur {courses.length}
                      {upcoming.isToday
                        ? " · aujourd’hui"
                        : ` · dans ${daysBetween(today, upcoming.course.session_date!)} jours`}
                    </p>
                  </>
                ) : (
                  <p className="text-muted-foreground mb-3">Aucune séance datée à venir.</p>
                )}
                {trame.dueDate ? (
                  <>
                    <p>
                      <strong>Échéance de la progression</strong>
                    </p>
                    <p className="text-muted-foreground">
                      {trame.dueDate.toLocaleDateString("fr-FR")}
                      {trame.level === "sent" || dueIn === null
                        ? ""
                        : dueIn < 0
                          ? ` · dépassée de ${-dueIn} jour${-dueIn > 1 ? "s" : ""}`
                          : ` · dans ${dueIn} jour${dueIn > 1 ? "s" : ""}`}
                    </p>
                  </>
                ) : null}
              </Card>
              <Card id="chiffres" title="Le module en chiffres">
                <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2">
                  <dt className="text-muted-foreground">Séances prêtes</dt>
                  <dd>
                    <strong>
                      {readyCourses} / {courses.length}
                    </strong>
                  </dd>
                  <dt className="text-muted-foreground">Attendus couverts</dt>
                  <dd>
                    <strong>
                      {coverage.covered} / {coverage.total}
                    </strong>
                  </dd>
                  <dt className="text-muted-foreground">Ressources retenues</dt>
                  <dd>
                    <strong>{retained.length}</strong>
                  </dd>
                  <dt className="text-muted-foreground">Évaluations prévues</dt>
                  <dd>
                    <strong>
                      {planned.length} / {notes.requirement.total}
                    </strong>
                  </dd>
                  <dt className="text-muted-foreground">Grilles prêtes</dt>
                  <dd>
                    <strong>
                      {gridsReady} / {planned.length}
                    </strong>
                  </dd>
                  <dt className="text-muted-foreground">Groupes</dt>
                  <dd>
                    <strong>{groups.length}</strong>
                  </dd>
                </dl>
              </Card>
              <Card id="evals" title="Les évaluations">
                <p className="text-muted-foreground mb-3 text-sm">
                  Vois quand chaque évaluation croise tes séances.
                </p>
                <Link href={`/modules/${mod.id}/assessments`} className={BTN}>
                  Ouvrir les évaluations
                </Link>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
