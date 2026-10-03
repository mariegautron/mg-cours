import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Archive,
  CalendarPlus,
  CopyPlus,
  ChevronRight,
  Download,
  ExternalLink,
  Pencil,
  Play,
  Plus,
  Presentation,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { DownloadButton } from "@/components/download-button";
import { AdminDocsChecklist } from "@/components/modules/admin-docs-checklist";
import { CourseList } from "@/components/modules/course-list";
import { ModuleDocuments } from "@/components/modules/module-documents";
import { ArchiveModuleButton } from "@/components/modules/archive-module-button";
import { ModuleDangerZone } from "@/components/modules/module-danger-zone";
import { OutlineActions } from "@/components/modules/outline-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExpectationsSummary } from "@/components/modules/expectations-summary";
import { RetainedResources } from "@/components/modules/retained-resources";
import { ModuleTabs } from "@/components/modules/module-tabs";
import { defaultModuleTab } from "@/lib/modules/tabs";
import { TabsContent } from "@/components/ui/tabs";
import {
  checkPlannedHours,
  formatDuration,
  totalPlannedHours,
} from "@/lib/modules/course-duration";
import { experienceNotes } from "@/lib/modules/duplicate-evaluations";
import { listModuleAssessments, moduleNoteProgress } from "@/lib/assessments/queries";
import {
  getModule,
  getModuleCourses,
  getModuleDocuments,
  getModuleExpectations,
  getRetainedResources,
} from "@/lib/modules/queries";
import { highlightedSession, todayInParis } from "@/lib/modules/next-session";
import { getOutline } from "@/lib/outline/queries";
import { listModuleGroups } from "@/lib/students/queries";
import { getInvoiceByModule, loadInvoiceContext } from "@/lib/invoice/queries";
import { ficheNotice } from "@/lib/modules/fiche-import";
import { getModuleCoverage } from "@/lib/modules/coverage-queries";
import { ModuleJourney } from "@/components/modules/module-journey";
import { buildJourney } from "@/lib/modules/journey";
import { trameMessage, trameStatus, type TrameAlertLevel } from "@/lib/ynov/trame";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const mod = await getModule(id);
  return { title: mod?.name ?? "Module" };
}

const TRAME_VARIANT: Record<TrameAlertLevel, "default" | "destructive" | "outline" | "secondary"> =
  {
    sent: "secondary",
    overdue: "destructive",
    urgent: "destructive",
    warning: "outline",
    ok: "outline",
    unknown: "outline",
  };

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

  const notes = await moduleNoteProgress(id, mod.total_hours, assessments);
  const trame = trameStatus(mod.first_session_date, mod.iceberg_state);
  const readyCourses = courses.filter((c) => c.prep_status === "ready").length;
  const gradedAssessments = assessments.filter((a) => !a.makeup_of_id && a.gradeCount > 0).length;
  const depositedOutline = documents.find((d) => d.kind === "outline_sent") ?? null;
  const toBuild = new Set(
    courses.flatMap((c) => c.resources.filter((r) => r.status === "progress").map((r) => r.id)),
  ).size;
  const plannedHours = totalPlannedHours(courses);
  const hoursCheck = checkPlannedHours(plannedHours, mod.total_hours);
  const upcoming = mod.archived_at ? null : highlightedSession(courses, todayInParis());

  // « Où j'en suis » : parcours du module, source unique du badge « Prochaine étape ».
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

  // Onglet Progression
  const progressionTab = (
    <TabsContent value="progression" className="space-y-6">
      <ExpectationsSummary moduleId={mod.id} expectations={expectations} />
      <section aria-labelledby="trame">
        <h2 id="trame" className="mb-1 scroll-mt-16 text-lg font-medium">
          Progression pédagogique
        </h2>
        {depositedOutline ? (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              Progression envoyée (PDF déposé le{" "}
              {new Date(depositedOutline.created_at).toLocaleDateString("fr-FR")})
            </Badge>
            <Button asChild size="sm" variant="secondary">
              <a href={`/api/modules/${mod.id}/documents/${depositedOutline.id}`}>
                <Download aria-hidden />
                Télécharger
              </a>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <a
                href={`/api/modules/${mod.id}/documents/${depositedOutline.id}?inline=1`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink aria-hidden />
                Voir
                <span className="sr-only"> — s’ouvre dans un nouvel onglet</span>
              </a>
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={TRAME_VARIANT[trame.level]}>
              {trameMessage(trame.level, trame.daysUntilDue)}
            </Badge>
            {trame.dueDate ? (
              <span className="text-muted-foreground text-sm">
                Échéance : {trame.dueDate.toLocaleDateString("fr-FR")}
              </span>
            ) : null}
          </div>
        )}
        {outline && depositedOutline ? (
          <p className="text-muted-foreground mt-2 text-sm">
            Progression générée depuis les séances le{" "}
            {new Date(outline.generated_at).toLocaleDateString("fr-FR")} (brouillon, non envoyée).
          </p>
        ) : outline ? (
          <p className="text-muted-foreground mt-2 text-sm">
            Générée le {new Date(outline.generated_at).toLocaleDateString("fr-FR")}
            {outline.sent_at
              ? ` · envoyée le ${new Date(outline.sent_at).toLocaleDateString("fr-FR")}`
              : ""}
            {outline.validated_at
              ? ` · validée le ${new Date(outline.validated_at).toLocaleDateString("fr-FR")}`
              : ""}
            .
          </p>
        ) : null}
        <div className="mt-3">
          <OutlineActions
            moduleId={mod.id}
            status={outline?.status ?? null}
            hasDepositedOutline={!!depositedOutline}
            archived={!!mod.archived_at}
          />
        </div>
      </section>
    </TabsContent>
  );

  // Onglet Séances
  const coursesTab = (
    <TabsContent value="courses" className="space-y-6">
      <RetainedResources moduleId={mod.id} resources={retained} />
      <section aria-labelledby="courses">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="courses" className="scroll-mt-16 text-lg font-medium">
              Séances ({courses.length})
            </h2>
            {courses.length ? (
              <p className="text-muted-foreground text-sm">
                {readyCourses}/{courses.length} prête{readyCourses > 1 ? "s" : ""}
                {plannedHours > 0
                  ? ` · ${formatDuration(plannedHours)} planifiées / ${mod.total_hours} h`
                  : ""}
              </p>
            ) : null}
            {plannedHours > 0 && !hoursCheck.consistent ? (
              <p role="status" className="text-destructive text-sm">
                <span className="font-medium">À vérifier :</span> {hoursCheck.message}
              </p>
            ) : null}
            {toBuild > 0 ? (
              <p className="text-sm">
                {toBuild} ressource{toBuild > 1 ? "s" : ""} à construire dans ce module (jamais
                projetée{toBuild > 1 ? "s" : ""}).
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {courses.length ? (
              <Button asChild size="sm" variant="secondary">
                <Link href={`/modules/${mod.id}/build`}>Construire les séances</Link>
              </Button>
            ) : null}
            {courses.length ? (
              <Button asChild size="sm" variant="secondary">
                <Link href={`/modules/${mod.id}/frise`}>Frise du module</Link>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="secondary">
              <Link href={`/modules/${mod.id}/schedule`}>
                <CalendarPlus aria-hidden />
                Depuis un planning
              </Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/modules/${mod.id}/import-courses`}>
                <CopyPlus aria-hidden />
                Depuis un autre module
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/modules/${mod.id}/courses/new`}>
                <Plus aria-hidden />
                Ajouter une séance
              </Link>
            </Button>
          </div>
        </div>
        <CourseList
          moduleId={mod.id}
          courses={courses}
          highlightedId={upcoming?.course.id ?? null}
        />
        {courses.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm">Cours en PDF pour Moodle :</span>
            <DownloadButton
              href={`/api/modules/${mod.id}/courses`}
              doneLabel="Cours téléchargés (un seul PDF)."
            >
              Un seul PDF
            </DownloadButton>
            <DownloadButton
              href={`/api/modules/${mod.id}/courses?format=zip`}
              kind="zip"
              doneLabel="Cours téléchargés (un PDF par séance)."
            >
              Un PDF par séance (zip)
            </DownloadButton>
          </div>
        ) : null}
      </section>
    </TabsContent>
  );

  // Onglet Groupes et évaluations
  const groupsEvaluationsTab = (
    <TabsContent value="groups-evaluations" className="space-y-4">
      <section aria-labelledby="groups">
        <div className="flex items-center justify-between">
          <h2 id="groups" className="scroll-mt-16 text-lg font-medium">
            Groupes ({groups.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/modules/${mod.id}/appreciations`}>Appréciations Hyperplanning</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/modules/${mod.id}/groups/wizard`}>Constituer les groupes</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/modules/${mod.id}/groups/new`}>
                <Plus aria-hidden />
                Ajouter un groupe
              </Link>
            </Button>
          </div>
        </div>
        {groups.length === 0 ? (
          <EmptyState
            compact
            title="Pas encore de groupes"
            description="Crée un groupe (TP, TD, projet) pour y rattacher les étudiant·es et saisir les notes."
            actions={[{ label: "Créer le premier groupe", href: `/modules/${mod.id}/groups/new` }]}
          />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/modules/${mod.id}/groups/${g.id}`}
                  className="hover:bg-accent focus-visible:ring-ring block rounded-lg border p-3 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <p className="font-medium">{g.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {g.members.length} étudiant·e{g.members.length > 1 ? "s" : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="assessments" className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="assessments" className="scroll-mt-16 text-lg font-medium">
              Évaluations
            </h2>
            <p className="text-muted-foreground text-sm">
              {assessments.length} évaluation{assessments.length > 1 ? "s" : ""}
              {assessments.length ? ` (${gradedAssessments} avec des notes saisies)` : ""} ·{" "}
              {notes.enteredTotal}/{notes.requirement.total} note
              {notes.requirement.total > 1 ? "s" : ""} requise
              {notes.requirement.total > 1 ? "s" : ""} obtenue
              {notes.enteredTotal > 1 ? "s" : ""}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link href={`/modules/${mod.id}/project`}>Projet fil rouge</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href={`/modules/${mod.id}/assessments`}>Voir les évaluations</Link>
            </Button>
          </div>
        </div>
      </section>
    </TabsContent>
  );

  // Onglet Administratif (Documents + Facturation + Actions)
  const adminTab = (
    <TabsContent value="admin" className="space-y-4">
      <section aria-labelledby="documents">
        <h2 id="documents" className="mb-3 scroll-mt-16 text-lg font-medium">
          Documents{documents.length ? ` (${documents.length})` : ""}
        </h2>
        {mod.slides_url ? (
          <p className="mb-3">
            <Button asChild size="sm" variant="secondary">
              <a href={mod.slides_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden />
                Ouvrir les slides (Figma)
                <span className="sr-only"> — s’ouvre dans un nouvel onglet</span>
              </a>
            </Button>
          </p>
        ) : null}
        <ModuleDocuments moduleId={mod.id} documents={documents} />
      </section>

      <section aria-labelledby="billing" className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="billing" className="scroll-mt-16 text-lg font-medium">
              Facturation
            </h2>
            <p className="text-muted-foreground text-sm">
              Conditions YNOV, mentions obligatoires et facture Factur-X.
            </p>
          </div>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/modules/${mod.id}/billing`}>Voir la facturation</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="admin-docs" className="space-y-4">
        <h2 id="admin-docs" className="mb-3 scroll-mt-16 text-lg font-medium">
          Documents administratifs
        </h2>
        <AdminDocsChecklist
          moduleId={mod.id}
          adminDocs={(mod.admin_docs as Record<string, boolean>) ?? {}}
        />
      </section>

      <section aria-labelledby="danger" className="space-y-4">
        <h2 id="danger" className="mb-3 scroll-mt-16 text-lg font-medium">
          Actions
        </h2>
        <div className="space-y-6">
          {mod.archived_at ? null : (
            <ArchiveModuleButton id={mod.id} archived={false} name={mod.name} />
          )}
          <ModuleDangerZone
            id={mod.id}
            year={mod.year}
            assessmentExperience={experienceNotes(assessments)}
            experience={courses.flatMap((c, i) =>
              c.retro_note?.trim()
                ? [{ number: i + 1, title: c.title, text: c.retro_note.trim() }]
                : [],
            )}
          />
        </div>
      </section>
    </TabsContent>
  );

  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-2">
        <nav aria-label="Fil d’Ariane" className="text-muted-foreground text-sm">
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link
                href={mod.archived_at ? "/modules?filter=archived" : "/modules"}
                className="hover:text-foreground underline-offset-2 hover:underline"
              >
                {mod.archived_at ? "Modules archivés" : "Modules"}
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="size-3.5" />
            </li>
            <li>
              <span aria-current="page" className="text-foreground">
                {mod.name}
              </span>
            </li>
          </ol>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{mod.name}</h1>
            <p className="text-muted-foreground">
              {mod.school?.name ?? "École non renseignée"} · {mod.level ?? "—"} · {mod.year}
              {mod.ycode ? ` · YCODE ${mod.ycode}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/present/modules/${mod.id}`}>
                <Presentation aria-hidden />
                Présenter le module
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/modules/${mod.id}/edit`}>
                <Pencil aria-hidden />
                Modifier
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {ficheMessage ? (
        <p
          role="status"
          className={
            ficheMessage.tone === "ok"
              ? "rounded-lg border p-3 text-sm"
              : "border-destructive/50 rounded-lg border p-3 text-sm"
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

      {upcoming ? (
        <section
          aria-labelledby="upcoming"
          className="halo bg-card flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4"
        >
          <div>
            <h2 id="upcoming" className="text-primary text-sm font-medium">
              {upcoming.isToday ? "Séance du jour" : "Prochaine séance"}
            </h2>
            <p className="font-heading text-lg font-semibold">
              Séance {upcoming.number} — {upcoming.course.title}
            </p>
            {!upcoming.isToday && upcoming.course.session_date ? (
              <p className="text-muted-foreground text-sm">
                {new Date(`${upcoming.course.session_date}T00:00:00`).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            ) : null}
          </div>
          <Button asChild size="lg">
            <Link href={`/present/modules/${mod.id}/courses/${upcoming.course.id}`}>
              <Play aria-hidden />
              Faire cours
            </Link>
          </Button>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">{mod.total_hours} h</Badge>
        <Badge variant={notes.satisfied ? "secondary" : "outline"}>
          {notes.enteredTotal}/{notes.requirement.total} note
          {notes.requirement.total > 1 ? "s" : ""} ({notes.requirement.group} groupe
          {notes.requirement.group > 1 ? "s" : ""} + {notes.requirement.individual} individuelle
          {notes.requirement.individual > 1 ? "s" : ""})
          {!notes.requirement.exact ? " — hors palier, à confirmer" : ""}
        </Badge>
        {journey.badge ? (
          <Badge variant={journey.current ? "outline" : "secondary"}>{journey.badge}</Badge>
        ) : null}
      </div>

      <ModuleJourney journey={journey} />

      {mod.archived_at ? (
        <div className="bg-muted flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4">
          <p className="flex items-start gap-2 text-sm">
            <Archive aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong>Module archivé</strong> le{" "}
              {new Date(mod.archived_at).toLocaleDateString("fr-FR")} : il n’apparaît plus dans le
              tableau de bord ni dans la facturation.
            </span>
          </p>
          <ArchiveModuleButton id={mod.id} archived compact name={mod.name} />
        </div>
      ) : null}

      <ModuleTabs
        defaultTab={defaultModuleTab(trame.level)}
        labels={{
          progression: "Progression",
          courses: `Séances (${courses.length})`,
          "groups-evaluations": `Groupes (${groups.length}) et évaluations`,
          admin: "Administratif",
        }}
      >
        {progressionTab}
        {coursesTab}
        {groupsEvaluationsTab}
        {adminTab}
      </ModuleTabs>
    </div>
  );
}
