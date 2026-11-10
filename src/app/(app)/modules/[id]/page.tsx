import { getAppreciationProgress } from "@/lib/appreciations/queries";
import { DeleteModuleDialog } from "@/components/modules/delete-module-dialog";
import type { Metadata } from "next";
import { loadRoster } from "@/lib/students/enrollment";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Presentation } from "lucide-react";

import { Pill } from "@/components/dashboard/pill";
import { ArchiveModuleButton } from "@/components/modules/archive-module-button";
import { FinishModuleButton } from "@/components/modules/finish-module-button";
import { JourneyHero } from "@/components/modules/journey-hero";
import { JourneySteps } from "@/components/modules/journey-steps";
import { UpcomingAssessmentsCard } from "@/components/assessments/upcoming-assessments-card";
import { listUpcomingAssessments } from "@/lib/assessments/day-j-queries";
import { loadModuleMean } from "@/lib/dashboard/overview-queries";
import { daysBetween } from "@/lib/dashboard/todo";
import { formatSessionDay } from "@/lib/dashboard/today";
import { meanLabel } from "@/lib/dashboard/overview";
import { formatTimeRange } from "@/lib/modules/course-duration";
import { getExpectationCoverageView } from "@/lib/modules/expectation-coverage-queries";
import { getModuleCoverage } from "@/lib/modules/coverage-queries";
import { ficheNotice } from "@/lib/modules/fiche-import";
import { buildHero } from "@/lib/modules/hero";
import { isModuleShared } from "@/lib/modules/frise-queries";
import { buildJourney } from "@/lib/modules/journey";
import { parseCarryOver } from "@/lib/present/carry-over";
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
import { isUngradedReview } from "@/lib/assessments/progress-review";
import { listModuleAssessments, moduleNoteProgress } from "@/lib/assessments/queries";
import { getInvoiceByModule, loadInvoiceContext } from "@/lib/invoice/queries";
import { getOutline } from "@/lib/outline/queries";
import { ReopenModuleButton } from "@/components/modules/reopen-module-button";
import { isPaid, isSent } from "@/lib/invoice/simple";
import { loadMakeupGroups } from "@/lib/assessments/makeup-queries";
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
  const trame = trameStatus(
    mod.first_session_date,
    mod.iceberg_state,
    new Date(),
    outline?.status === "sent" ||
      outline?.status === "validated" ||
      documents.some((d) => d.kind === "outline_sent"),
  );
  const coverage = await getModuleCoverage(id, expectations, retained);
  const expCoverage = await getExpectationCoverageView(id);
  const shared = await isModuleShared(id);
  const appreciations = await getAppreciationProgress(id);
  const makeupRows = (await loadMakeupGroups(id)).flatMap((g) => g.rows);
  const makeupsPending = makeupRows.filter((r) => r.step !== "done").length;
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
    shared,
    appreciations,
    makeups: { pending: makeupsPending, total: makeupRows.length },
    roster: await loadRoster(id),
  });

  // Fiches « à reporter » d'une clôture sans séance suivante : à signaler jusqu'à ce qu'elles aient une place.
  const pendingCarry = courses.flatMap((c) =>
    parseCarryOver((c as { carried_over?: unknown }).carried_over)
      .carried.filter((e) => e.pending)
      .map((e) => e.title),
  );
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
  // Fiche du module : les évaluations des 60 prochains jours dans « À venir » ; la carte garde 14 jours.
  const moduleEvals = await listUpcomingAssessments(today, 60, id);
  const upcomingEvals = moduleEvals.filter((a) => daysBetween(today, a.date) <= 14);
  const planned = assessments.filter((a) => !a.makeup_of_id && !a.is_bonus && !isUngradedReview(a));
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
            Prévues {planned.length} / {notes.requirement.total} · Notées {notes.enteredTotal} /{" "}
            {notes.requirement.total}
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

      {!mod.school_id ? (
        <p role="note" className="border-primary/50 bg-primary/10 rounded-2xl border p-3 text-sm">
          École non choisie : règles de Nantes Ynov Campus appliquées par défaut.{" "}
          <Link
            href={`/modules/${mod.id}/edit`}
            className="font-semibold underline underline-offset-2"
          >
            Choisir l’école
          </Link>
        </p>
      ) : null}

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

      {pendingCarry.length ? (
        <p role="status" className="rounded-2xl border border-dashed p-3 text-sm">
          <strong>À reporter, en attente :</strong> {pendingCarry.join(", ")}. Il n’y a pas de
          séance suivante pour les accueillir.{" "}
          <Link href={`/modules/${mod.id}/courses/new`} className="underline underline-offset-2">
            Ajouter une séance
          </Link>
          , puis « Modifier la clôture » de la séance pour les y placer.
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
              {mod.finished_at ? <ReopenModuleButton id={mod.id} name={mod.name} /> : null}
              <Card id="bilan" title="Le bilan">
                <div className="grid grid-cols-2 gap-2.5">
                  <Stat label="Moyenne de la classe" value={meanLabel(mean) ?? "—"} />
                  <Stat label="Étudiant·es" value={String(members.size)} />
                  <Stat label="Heures faites" value={`${mod.total_hours} h`} />
                  <Stat
                    label="Facture"
                    value={
                      isPaid(mod.iceberg_state)
                        ? "Payée"
                        : isSent(mod.iceberg_state)
                          ? "Envoyée"
                          : invoice
                            ? INVOICE_LABEL[invoice.status]
                            : "À déposer"
                    }
                  />
                </div>
              </Card>
              <Card id="retour" title="Ce que tu as retenu" aside={<Pill tone="warn">Privé</Pill>}>
                {retro ? (
                  <p className="text-sm whitespace-pre-wrap">{retro}</p>
                ) : (
                  <p className="text-muted-foreground mb-3 text-sm">
                    {mod.finished_at
                      ? "Rien d’écrit."
                      : "Ce que tu retiens de ce module, à écrire avant de le terminer."}
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
              {makeupsPending > 0 ? (
                <Card id="rattrapages" title="Rattrapages">
                  <p>
                    <strong>{makeupsPending} à faire</strong> : absences excusées à rattraper avant
                    les appréciations et l’envoi des notes.
                  </p>
                  <Link
                    href={`/modules/${id}/rattrapages`}
                    className="font-semibold underline underline-offset-2"
                  >
                    Voir les rattrapages
                  </Link>
                </Card>
              ) : null}
              {upcomingEvals.length > 0 ? (
                <UpcomingAssessmentsCard
                  items={upcomingEvals}
                  showModule={false}
                  headingLevel={3}
                />
              ) : null}
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
                {moduleEvals.length > 0 ? (
                  <>
                    <p>
                      <strong>Évaluations</strong>
                    </p>
                    <ul className="text-muted-foreground mb-3 text-sm">
                      {moduleEvals.map((a) => (
                        <li key={a.id}>
                          <Link
                            href={`/modules/${id}/assessments/${a.id}`}
                            className="text-foreground underline-offset-2 hover:underline"
                          >
                            {a.title}
                          </Link>{" "}
                          · {formatSessionDay(a.date)} · dans {daysBetween(today, a.date)} jours
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
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
                    <span className="text-muted-foreground block text-xs">
                      {expCoverage.summary.byCourse} par un cours ·{" "}
                      {expCoverage.summary.byAssessment} par une évaluation ·{" "}
                      {expCoverage.summary.byNone} par aucun
                    </span>
                    <Link
                      href={`/modules/${id}/couverture`}
                      className="text-primary text-xs underline underline-offset-2"
                    >
                      Voir la couverture
                    </Link>
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

      <section
        aria-labelledby="zone-sensible"
        className="border-destructive/40 space-y-2 rounded-2xl border p-5"
      >
        <h2 id="zone-sensible" className="font-heading text-lg font-bold">
          Zone sensible
        </h2>
        <p className="text-muted-foreground text-sm">
          Supprimer le module efface définitivement ses séances, évaluations, notes, groupes et
          documents. Ta bibliothèque et tes étudiant·es ne sont pas touchés. Il faut retaper le nom
          du module pour confirmer.
        </p>
        <DeleteModuleDialog id={mod.id} name={mod.name} />
      </section>
    </div>
  );
}
