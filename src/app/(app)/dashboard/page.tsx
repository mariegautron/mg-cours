import { displayFirstName } from "@/lib/ynov/teacher-name";
import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarCheck,
  ClipboardCheck,
  ListChecks,
  NotebookPen,
  PenLine,
  Play,
  Users,
} from "lucide-react";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { Pill } from "@/components/dashboard/pill";
import { TodayPrep } from "@/components/dashboard/today-prep";
import { WeekCard } from "@/components/dashboard/week-card";
import {
  listCourseProgress,
  loadCourseAssessments,
  loadFocusKpis,
  loadPreviousSession,
} from "@/lib/dashboard/overview-queries";
import {
  dayLine,
  dayTile,
  meanLabel,
  percent,
  progressLabel,
  untilLabel,
} from "@/lib/dashboard/overview";
import { CopyMessageButton } from "@/components/projects/copy-message-button";
import { listSurprisesForCourses } from "@/lib/projects/surprise-queries";
import { copyText, dueToday } from "@/lib/projects/surprises";
import { EmptyState } from "@/components/empty-state";
import { Mascot } from "@/components/mascot";
import {
  getSessionPrep,
  listCoursesAfter,
  listCoursesBetween,
  listCoursesOn,
  listResumeCandidates,
} from "@/lib/dashboard/queries";
import { formatWhen, pickResume, RESUME_LABELS } from "@/lib/dashboard/resume";
import { buildTodos, pickTodos, type TodoSources } from "@/lib/dashboard/todo";
import { formatSessionDay, nextSession, todaySessions } from "@/lib/dashboard/today";
import { daysBetween, weekDays, weekRange } from "@/lib/dashboard/week";
import { formatTimeRange } from "@/lib/modules/course-duration";
import { listBillingOverview } from "@/lib/invoice/queries";
import { todayInParis } from "@/lib/modules/next-session";
import { listModules } from "@/lib/modules/queries";
import { getProfile } from "@/lib/settings/queries";
import { alertMascotMood, outlineAlerts, outlineAlertSummary } from "@/lib/ynov/trame";

export const metadata: Metadata = { title: "Tableau de bord" };

const BTN =
  "focus-visible:ring-ring hover:bg-accent inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none";

const TODO_TONES = ["bg-primary/20 text-primary", "bg-sun/20 text-sun", "bg-mint/20 text-mint"];

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const passwordChanged = (await searchParams).password === "changed";
  const today = todayInParis();
  const week = weekRange(today);
  const [
    modules,
    billing,
    profile,
    coursesToday,
    coursesAfter,
    coursesWeek,
    resumeCandidates,
    progress,
  ] = await Promise.all([
    listModules(),
    listBillingOverview(),
    getProfile(),
    listCoursesOn(today),
    listCoursesAfter(today),
    listCoursesBetween(week.from, week.to),
    listResumeCandidates(),
    listCourseProgress(),
  ]);
  const resume = pickResume(resumeCandidates);
  const sessions = todaySessions(coursesToday, today);
  const upcoming = sessions.length ? null : nextSession(coursesAfter, today);
  const alerts = outlineAlerts(modules);
  const summary = outlineAlertSummary(alerts);
  const firstName = displayFirstName(profile?.legal_name);

  const preps = await Promise.all(sessions.map((c) => getSessionPrep(c.module.id, c.id)));
  // Imprévus du client à envoyer aujourd'hui (US-128) : séances du jour, pas encore envoyés.
  const todayIds = new Set(sessions.map((c) => c.id));
  const surprises = dueToday(await listSurprisesForCourses([...todayIds]), todayIds);

  const todos = pickTodos(
    buildTodos({
      today,
      outlineAlerts: alerts,
      upcomingCourses: [...coursesToday, ...coursesAfter]
        .filter((c) => c.module && !c.module.archived_at)
        .map((c) => ({
          id: c.id,
          title: c.title,
          position: c.position,
          session_date: c.session_date,
          prep_status: c.prep_status ?? "draft",
          module: { id: c.module!.id, name: c.module!.name },
        })),
      billing: billing.flatMap<TodoSources["billing"][number]>((b) =>
        b.kind === "ready"
          ? [{ module: b.module, kind: "ready" as const }]
          : b.kind === "invoiced" && b.invoice.status === "ready"
            ? [{ module: b.module, kind: "toSend" as const }]
            : b.kind === "invoiced" && b.invoice.status === "sent"
              ? [{ module: b.module, kind: "toCollect" as const }]
              : [],
      ),
    }),
  );
  const { days, nextWeek } = weekDays(
    today,
    coursesWeek.filter((c) => c.module && !c.module.archived_at),
  );
  const doneIds = new Set(
    coursesWeek.filter((c) => c.session_date && c.session_date < today).map((c) => c.id),
  );
  const tiles = days.map((d) => dayTile(d, today, (c) => doneIds.has(c.id)));
  const hrefs = days.map((d) =>
    d.courses[0]?.module
      ? `/modules/${d.courses[0].module.id}/courses/${d.courses[0].id}/edit`
      : null,
  );
  const activeModules = modules.filter((m) => !m.archived_at && !m.finished_at);

  // Module « du moment » : celui de la séance du jour, sinon du prochain cours, sinon le premier actif.
  const focusFrom = sessions[0]?.module ?? upcoming?.module ?? activeModules[0] ?? null;
  const focusName = focusFrom && "name" in focusFrom ? focusFrom.name : "";
  const focus = focusFrom ? await loadFocusKpis(focusFrom.id, focusName) : null;
  const hero = sessions[0] ?? null;
  const [previous, heroAssessments] = hero
    ? await Promise.all([
        loadPreviousSession(hero.module.id, hero.id),
        loadCourseAssessments(hero.module.id, hero.id),
      ])
    : [null, []];
  const dayText = formatSessionDay(today);
  const nextUntil = upcoming ? daysBetween(today, upcoming.session_date!) : null;

  const todoCard = (
    <section aria-labelledby="todo" className="bg-card rounded-3xl border p-5 shadow-sm">
      <h2 id="todo" className="font-heading text-xl font-bold">
        À faire
      </h2>
      <p className="text-muted-foreground mb-1 text-sm">Trois choses, par urgence.</p>
      {todos.length === 0 ? (
        <EmptyState
          compact
          title="Rien d’urgent"
          description="Tout est à jour. Profite-en pour préparer le prochain module."
        />
      ) : (
        <ol>
          {todos.map((t, i) => (
            <li
              key={t.key}
              className="flex min-h-16 items-center justify-between gap-3 border-t py-3 first:border-t-0"
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <span
                  aria-hidden
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full font-extrabold ${TODO_TONES[i % 3]}`}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-muted-foreground text-sm">{t.detail}</p>
                </div>
              </div>
              <Link href={t.href} className={`${BTN} shrink-0`}>
                Ouvrir<span className="sr-only"> : {t.title}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );

  const surprisesCard = surprises.length ? (
    <section aria-labelledby="surprises" className="bg-card rounded-3xl border p-5 shadow-sm">
      <h2 id="surprises" className="font-heading mb-2 text-xl font-bold">
        Imprévu{surprises.length > 1 ? "s" : ""} à envoyer
      </h2>
      <ul className="space-y-3">
        {surprises.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">Imprévu à envoyer : {s.title}</p>
              <p className="text-muted-foreground text-sm">
                <Link
                  href={`/modules/${s.moduleId}/project`}
                  className="underline underline-offset-2"
                >
                  {s.moduleName}
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <CopyMessageButton text={copyText(s)} label={s.title} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  ) : null;

  const resumeCard = resume ? (
    <section aria-labelledby="resume" className="bg-card rounded-3xl border p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="bg-coral/15 text-coral flex size-11 shrink-0 items-center justify-center rounded-2xl"
        >
          <PenLine className="size-5" />
        </span>
        <div>
          <h2 id="resume" className="font-heading text-lg font-bold">
            Reprendre
          </h2>
          <p className="font-semibold">{resume.title}</p>
          <p className="text-muted-foreground text-sm">
            {RESUME_LABELS[resume.kind].prefix}
            {resume.context ? ` · ${resume.context}` : ""} · modifié {formatWhen(resume.updatedAt)}
          </p>
        </div>
      </div>
      <Link href={resume.href} className={`${BTN} mt-3`}>
        Reprendre<span className="sr-only"> : {resume.title}</span>
      </Link>
    </section>
  ) : null;

  const modulesCard = (
    <section aria-labelledby="mods" className="bg-card rounded-3xl border p-5 shadow-sm">
      <h2 id="mods" className="font-heading mb-2 text-lg font-bold">
        Tes modules en cours
      </h2>
      {activeModules.length === 0 ? (
        <p className="text-muted-foreground mb-2 text-sm">Aucun module actif pour l’instant.</p>
      ) : (
        <ul className="mb-2 space-y-2">
          {activeModules.slice(0, 3).map((m) => {
            const p = progress.get(m.id);
            return (
              <li key={m.id}>
                <Link
                  href={`/modules/${m.id}`}
                  className="font-semibold underline-offset-2 hover:underline"
                >
                  {m.name}
                </Link>
                {p && p.total ? (
                  <p className="text-muted-foreground text-sm">{progressLabel(p.done, p.total)}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <Link href="/modules" className={BTN}>
        Voir tous les modules
      </Link>
    </section>
  );

  const weekCard = (
    <WeekCard
      title={nextWeek ? "La semaine prochaine" : "Cette semaine"}
      tiles={tiles}
      hrefs={hrefs}
    />
  );

  if (hero) {
    const prep = preps[0];
    const range = formatTimeRange(hero.start_time, hero.end_time);
    return (
      <div className="space-y-5">
        {passwordChanged ? (
          <p role="status" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            Mot de passe changé. Tu es connectée.
          </p>
        ) : null}
        <header>
          <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Aujourd’hui · {dayText}
          </h1>
          <p className="text-muted-foreground mt-1.5">
            Ta journée en un coup d’œil : la séance en cours, ce qu’il faut savoir avant d’entrer,
            ce qui vient après.
          </p>
        </header>

        <section
          aria-labelledby="seance"
          className="bg-primary/15 border-primary/60 flex flex-wrap items-center justify-between gap-6 rounded-3xl border p-6 sm:p-7"
        >
          <div className="min-w-0">
            <p className="text-primary mb-1.5 text-[0.8rem] font-bold tracking-wider uppercase">
              {range ? `${range} · ` : ""}Séance {prep.number} sur {prep.total} · {hero.module.name}
            </p>
            <h2 id="seance" className="font-heading text-3xl font-bold">
              {hero.title}
            </h2>
            <p className="mt-2 flex flex-wrap gap-1.5">
              {heroAssessments.map((a) => (
                <Pill key={a.id} tone="key">
                  Aujourd’hui : {a.title}
                </Pill>
              ))}
              <Pill>
                {focus?.groupNames.length ? `${focus.groupNames.join(", ")} · ` : ""}
                {prep.studentCount} étudiant·e{prep.studentCount > 1 ? "s" : ""}
              </Pill>
            </p>
          </div>
          <div className="flex w-full flex-col gap-2.5 sm:w-72">
            <Link
              href={`/modules/${hero.module.id}/courses/${hero.id}/start`}
              className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 font-semibold shadow-lg focus-visible:ring-2 focus-visible:outline-none"
            >
              <Play aria-hidden className="size-4" />
              Commencer le cours<span className="sr-only"> : {hero.title}</span>
              <span aria-hidden> →</span>
            </Link>
            <Link
              href={`/modules/${hero.module.id}/courses/${hero.id}/notebook`}
              className={`${BTN} min-h-12`}
            >
              <NotebookPen aria-hidden className="mr-2 size-4" />
              Ouvrir mon carnet<span className="sr-only"> : {hero.title}</span>
            </Link>
          </div>
        </section>

        <TodayPrep
          prep={prep}
          moduleId={hero.module.id}
          courseId={hero.id}
          title={hero.title}
          previous={previous}
          observations={focus?.students.observations ?? 0}
        />

        {surprisesCard}

        {sessions.length > 1 ? (
          <section aria-labelledby="after" className="bg-card rounded-3xl border p-5 shadow-sm">
            <h2 id="after" className="font-heading text-lg font-bold">
              Ensuite aujourd’hui
            </h2>
            <ul>
              {sessions.slice(1).map((c, i) => {
                const range2 = formatTimeRange(c.start_time, c.end_time);
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-4 border-t py-3 first:border-t-0"
                  >
                    <p className="text-muted-foreground">
                      {range2 ? `${range2} · ` : ""}Séance {preps[i + 1].number} · {c.title} ·{" "}
                      {c.module.name}
                    </p>
                    <Link href={`/modules/${c.module.id}/courses/${c.id}/edit`} className={BTN}>
                      Ouvrir la séance<span className="sr-only"> : {c.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-2">
          <div className="min-w-0 space-y-4">{todoCard}</div>
          <div className="min-w-0 space-y-4">
            {weekCard}
            {resumeCard}
            {modulesCard}
          </div>
        </div>
      </div>
    );
  }

  const kpi = focus;
  return (
    <div className="space-y-5">
      {passwordChanged ? (
        <p role="status" className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Mot de passe changé. Tu es connectée.
        </p>
      ) : null}
      <header className="flex flex-wrap items-center gap-3.5">
        <Mascot mood={alertMascotMood(summary)} className="size-14" />
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            {firstName ? `Bonjour ${firstName}` : "Bonjour"}
          </h1>
          <p className="text-muted-foreground">
            {dayLine(
              dayText,
              0,
              upcoming && nextUntil ? { daysUntil: nextUntil, position: upcoming.position } : null,
            )}
          </p>
        </div>
      </header>

      {kpi ? (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            tone="violet"
            icon={<CalendarCheck aria-hidden className="size-5" />}
            label="Séances faites"
            value={`${kpi.courses.done} / ${kpi.courses.total}`}
            percent={percent(kpi.courses.done, kpi.courses.total)}
            barLabel={`${percent(kpi.courses.done, kpi.courses.total)} % des séances`}
            detail={kpi.moduleName}
          />
          <KpiCard
            tone="mint"
            icon={<ClipboardCheck aria-hidden className="size-5" />}
            label={kpi.graded ? `${kpi.graded.title} corrigé` : "Évaluations corrigées"}
            value={kpi.graded ? `${kpi.graded.done} / ${kpi.graded.expected}` : "—"}
            percent={kpi.graded ? percent(kpi.graded.done, kpi.graded.expected) : 0}
            barLabel={kpi.graded ? "Copies corrigées" : "Aucune évaluation corrigée"}
            detail={
              kpi.graded && meanLabel(kpi.graded.valuesOn20)
                ? `moyenne de la classe ${meanLabel(kpi.graded.valuesOn20)}`
                : "pas encore de note"
            }
          />
          <KpiCard
            tone="sky"
            icon={<Users aria-hidden className="size-5" />}
            label="Étudiant·es suivis"
            value={String(kpi.students.total)}
            percent={percent(kpi.students.withPhoto, kpi.students.total)}
            barLabel={`${kpi.students.withPhoto} photo${kpi.students.withPhoto > 1 ? "s" : ""} sur ${kpi.students.total}`}
            detail={`${kpi.students.observations} observation${kpi.students.observations > 1 ? "s" : ""} notée${kpi.students.observations > 1 ? "s" : ""}`}
          />
          <KpiCard
            tone="sun"
            icon={<ListChecks aria-hidden className="size-5" />}
            label="À faire"
            value={String(todos.length)}
            percent={percent(todos.length, 3)}
            barLabel={`${todos.length} sur 3 au plus`}
            detail={todos.length ? "par urgence, ci-dessous" : "rien d’urgent"}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-start gap-4.5 lg:flex-nowrap">
        <div className="min-w-0 flex-1 basis-full space-y-3.5 lg:basis-0">
          {upcoming ? (
            <section
              aria-labelledby="next"
              className="bg-card border-l-primary rounded-3xl border border-l-[6px] p-6 shadow-sm"
            >
              <p className="mb-1.5 flex flex-wrap items-center gap-2.5">
                <Pill tone="wip">{untilLabel(today, upcoming.session_date!)}</Pill>
                <span className="text-muted-foreground text-sm">
                  {formatSessionDay(upcoming.session_date!)}
                  {formatTimeRange(upcoming.start_time, upcoming.end_time)
                    ? ` · ${formatTimeRange(upcoming.start_time, upcoming.end_time)}`
                    : ""}
                </span>
              </p>
              <h2 id="next" className="font-heading text-2xl font-bold sm:text-3xl">
                Séance {upcoming.position} · {upcoming.title}
              </h2>
              <p className="text-muted-foreground mt-1 mb-4">
                {upcoming.module.name}
                {focus?.groupNames.length ? ` · ${focus.groupNames.join(", ")}` : ""}
                {focus ? ` · ${focus.students.total} étudiant·es` : ""}
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Link
                  href={`/modules/${upcoming.module.id}/courses/${upcoming.id}/edit`}
                  className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex min-h-12 items-center rounded-xl px-5 font-semibold shadow-lg focus-visible:ring-2 focus-visible:outline-none"
                >
                  Préparer la séance {upcoming.position}
                </Link>
                <Link href={`/modules/${upcoming.module.id}`} className={`${BTN} min-h-12`}>
                  Voir le module
                </Link>
              </div>
            </section>
          ) : (
            <section aria-label="Prochaine séance" className="bg-card rounded-3xl border shadow-sm">
              {modules.length === 0 ? (
                <EmptyState
                  title="Pas encore de module"
                  description="Bienvenue. Rien à faire pour l’instant : crée ton premier module à partir de la fiche de l’école."
                  actions={[{ label: "Créer un module", href: "/modules/new" }]}
                />
              ) : (
                <EmptyState
                  title="Pas de cours cette semaine"
                  description="Profite-en pour préparer le prochain module."
                  actions={[{ label: "Voir mes modules", href: "/modules" }]}
                />
              )}
            </section>
          )}
          {todoCard}
          {surprisesCard}
        </div>
        <div className="w-full min-w-0 space-y-3.5 lg:w-[440px] lg:flex-none">
          {weekCard}
          {resumeCard}
          {modulesCard}
        </div>
      </div>
    </div>
  );
}
