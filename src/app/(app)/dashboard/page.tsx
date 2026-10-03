import type { Metadata } from "next";
import Link from "next/link";
import {
  BookMarked,
  CalendarCheck,
  CalendarDays,
  ListChecks,
  NotebookPen,
  Play,
  Receipt,
  TimerReset,
} from "lucide-react";

import { TodayPrep } from "@/components/dashboard/today-prep";
import { CopyMessageButton } from "@/components/projects/copy-message-button";
import { listSurprisesForCourses } from "@/lib/projects/surprise-queries";
import { copyText, dueToday } from "@/lib/projects/surprises";
import { EmptyState } from "@/components/empty-state";
import { Mascot } from "@/components/mascot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { weekDays, weekRange } from "@/lib/dashboard/week";
import { formatTimeRange } from "@/lib/modules/course-duration";
import { listBillingOverview } from "@/lib/invoice/queries";
import { todayInParis } from "@/lib/modules/next-session";
import { listModules } from "@/lib/modules/queries";
import { getProfile } from "@/lib/settings/queries";
import {
  alertMascotMood,
  othersLabel,
  outlineAlerts,
  outlineAlertSummary,
  type OutlineAlert,
} from "@/lib/ynov/trame";

export const metadata: Metadata = { title: "Tableau de bord" };

function StatCard({
  title,
  icon,
  chip,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  chip: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="bg-card animate-pop-in relative overflow-hidden rounded-2xl border p-5 transition-transform hover:-translate-y-0.5"
    >
      <div className="mb-3 flex items-center gap-3">
        <span className={`flex size-9 items-center justify-center rounded-xl ${chip}`}>{icon}</span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

/** En retard et J-7 : rouge ; J-15 : contour, libellé « à préparer » (pas seulement la couleur). */
function AlertBadge({ alert }: { alert: OutlineAlert<unknown> }) {
  if (alert.level === "overdue") {
    return <Badge variant="destructive">En retard de {Math.abs(alert.daysUntilDue)} j</Badge>;
  }
  if (alert.level === "urgent") {
    return <Badge variant="destructive">Urgent · J-{alert.daysUntilDue}</Badge>;
  }
  return <Badge variant="outline">À préparer · J-{alert.daysUntilDue}</Badge>;
}

export default async function DashboardPage() {
  const today = todayInParis();
  const week = weekRange(today);
  const [modules, billing, profile, coursesToday, coursesAfter, coursesWeek, resumeCandidates] =
    await Promise.all([
      listModules(),
      listBillingOverview(),
      getProfile(),
      listCoursesOn(today),
      listCoursesAfter(today),
      listCoursesBetween(week.from, week.to),
      listResumeCandidates(),
    ]);
  const resume = pickResume(resumeCandidates);
  const sessions = todaySessions(coursesToday, today);
  // Sans cours aujourd'hui, la carte dit quand est la suite (jamais de silence : « ça a chargé ? »).
  const upcoming = sessions.length ? null : nextSession(coursesAfter, today);
  const toInvoice = billing.filter((b) => b.kind === "ready");
  const toSend = billing.filter((b) => b.kind === "invoiced" && b.invoice.status === "ready");
  const toCollect = billing.filter((b) => b.kind === "invoiced" && b.invoice.status === "sent");
  const alerts = outlineAlerts(modules);
  const summary = outlineAlertSummary(alerts);

  const firstName = profile?.legal_name?.split(" ")[0];

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

  return (
    <div className="space-y-8">
      {sessions.length ? (
        <section aria-labelledby="today" className="bg-card halo space-y-3 rounded-2xl border p-5">
          <div className="flex items-center gap-3">
            <span className="bg-primary/15 text-primary flex size-9 items-center justify-center rounded-xl">
              <CalendarCheck aria-hidden className="size-5" />
            </span>
            <h2 id="today" className="text-base font-semibold">
              Aujourd’hui
            </h2>
          </div>
          <ul className="divide-y">
            {sessions.map((c, i) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="text-muted-foreground text-sm">
                    {formatTimeRange(c.start_time, c.end_time)
                      ? `${formatTimeRange(c.start_time, c.end_time)} · `
                      : ""}
                    {c.module.name}
                  </p>
                  <p className="font-heading text-lg font-semibold">{c.title}</p>
                  <p className="text-muted-foreground text-sm">
                    Séance {preps[i].number} sur {preps[i].total}
                    {preps[i].objective ? ` · Objectif : ${preps[i].objective}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={`/present/modules/${c.module.id}/courses/${c.id}`}>
                      <Play aria-hidden />
                      Faire cours<span className="sr-only"> : {c.title}</span>
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href={`/modules/${c.module.id}/courses/${c.id}/notebook`}>
                      <NotebookPen aria-hidden />
                      Carnet de séance<span className="sr-only"> : {c.title}</span>
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section aria-labelledby="today" className="bg-card space-y-3 rounded-2xl border p-5">
          <div className="flex items-center gap-3">
            <span className="bg-primary/15 text-primary flex size-9 items-center justify-center rounded-xl">
              <CalendarCheck aria-hidden className="size-5" />
            </span>
            <h2 id="today" className="text-base font-semibold">
              Aujourd’hui
            </h2>
          </div>
          <p>Pas de cours aujourd’hui.</p>
          {upcoming ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-primary text-sm font-medium">Prochain cours</p>
                <p className="font-heading text-2xl font-semibold">
                  Séance {upcoming.position} — {upcoming.title}
                </p>
                <p className="text-muted-foreground">
                  {upcoming.module.name} · {formatSessionDay(upcoming.session_date!)}
                  {formatTimeRange(upcoming.start_time, upcoming.end_time)
                    ? ` · ${formatTimeRange(upcoming.start_time, upcoming.end_time)}`
                    : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href={`/modules/${upcoming.module.id}/courses/${upcoming.id}/edit`}>
                    Préparer<span className="sr-only"> : {upcoming.title}</span>
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={`/modules/${upcoming.module.id}`}>Voir le module</Link>
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Aucune séance datée n’est à venir.</p>
          )}
        </section>
      )}

      {surprises.length ? (
        <section aria-labelledby="surprises" className="bg-card space-y-3 rounded-2xl border p-5">
          <h2 id="surprises" className="font-heading text-lg font-semibold">
            Imprévu{surprises.length > 1 ? "s" : ""} à envoyer
          </h2>
          <ul className="space-y-3">
            {surprises.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">Imprévu à envoyer : {s.title}</p>
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
      ) : null}

      {sessions.map((c, i) => (
        <TodayPrep
          key={c.id}
          prep={preps[i]}
          moduleId={c.module.id}
          courseId={c.id}
          title={c.title}
        />
      ))}

      {resume ? (
        <section
          aria-labelledby="resume"
          className="bg-card flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5"
        >
          <div>
            <h2 id="resume" className="text-primary text-sm font-medium">
              Reprendre là où tu t’étais arrêtée
            </h2>
            <p className="font-heading text-lg font-semibold">{resume.title}</p>
            <p className="text-muted-foreground text-sm">
              {RESUME_LABELS[resume.kind].prefix}
              {resume.context ? ` · ${resume.context}` : ""} · modifié{" "}
              {formatWhen(resume.updatedAt)}
            </p>
          </div>
          <Button asChild>
            <Link href={resume.href}>
              Reprendre<span className="sr-only"> : {resume.title}</span>
            </Link>
          </Button>
        </section>
      ) : null}

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            {firstName ? `Bonjour ${firstName}` : "Bonjour"}
          </h1>
          <p className="text-muted-foreground">
            {formatSessionDay(today)} ·{" "}
            {sessions.length
              ? `${sessions.length} séance${sessions.length > 1 ? "s" : ""} aujourd’hui`
              : "pas de cours aujourd’hui"}
          </p>
        </div>
        <Mascot mood={alertMascotMood(summary)} className="size-14" />
      </header>

      <section aria-labelledby="todo" className="bg-card space-y-3 rounded-2xl border p-5">
        <div className="flex items-center gap-3">
          <span className="bg-coral/15 text-coral flex size-9 items-center justify-center rounded-xl">
            <ListChecks aria-hidden className="size-5" />
          </span>
          <div>
            <h2 id="todo" className="text-base font-semibold">
              À faire
            </h2>
            <p className="text-muted-foreground text-sm">Trois choses au plus, par urgence.</p>
          </div>
        </div>
        {todos.length === 0 ? (
          <EmptyState
            compact
            title="Rien d’urgent"
            description="Tout est à jour. Profites-en pour préparer la suite."
          />
        ) : (
          <ol className="divide-y">
            {todos.map((t, i) => (
              <li
                key={t.key}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="bg-primary/15 text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium">{t.title}</p>
                    <p className="text-muted-foreground text-sm">{t.detail}</p>
                  </div>
                </div>
                <Button asChild variant="secondary">
                  <Link href={t.href}>
                    Ouvrir<span className="sr-only"> : {t.title}</span>
                  </Link>
                </Button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="week" className="bg-card space-y-3 rounded-2xl border p-5">
        <div className="flex items-center gap-3">
          <span className="bg-sky/15 text-sky flex size-9 items-center justify-center rounded-xl">
            <CalendarDays aria-hidden className="size-5" />
          </span>
          <h2 id="week" className="text-base font-semibold">
            {nextWeek ? "La semaine prochaine" : "Cette semaine"}
          </h2>
        </div>
        <ol className="grid gap-2 sm:grid-cols-5">
          {days.map((d) => (
            <li
              key={d.date}
              aria-current={d.isToday ? "date" : undefined}
              className={`rounded-xl border p-3 ${d.isToday ? "border-primary bg-primary/10" : ""}`}
            >
              <p className="text-sm font-semibold">
                {d.label} {d.day}
                {d.isToday ? <span className="text-primary"> · aujourd’hui</span> : null}
              </p>
              {d.courses.length ? (
                <ul className="mt-1 space-y-1 text-sm">
                  {d.courses.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/modules/${c.module!.id}/courses/${c.id}/edit`}
                        className="focus-visible:ring-ring rounded-sm underline underline-offset-2 focus-visible:ring-2 focus-visible:outline-none"
                      >
                        Séance {c.position}
                      </Link>
                      <span className="text-muted-foreground"> · {c.module!.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground mt-1 text-sm">Pas de séance</p>
              )}
            </li>
          ))}
        </ol>
      </section>

      <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Modules actifs"
          chip="bg-coral/15 text-coral"
          icon={<BookMarked aria-hidden className="size-5" />}
        >
          <p className="font-heading text-4xl font-bold">{modules.length}</p>
          <Link href="/modules" className="text-sm underline underline-offset-2">
            Voir les modules
          </Link>
        </StatCard>

        <StatCard
          title="Progressions pédagogiques à envoyer"
          chip="bg-sun/15 text-sun"
          icon={<TimerReset aria-hidden className="size-5" />}
        >
          {alerts.length === 0 ? (
            <EmptyState
              compact
              title="Rien d’urgent"
              description="Aucune progression à envoyer dans les 15 prochains jours."
            />
          ) : (
            <ul className="space-y-2 text-sm">
              {alerts.slice(0, 5).map((a) => (
                <li key={a.module.id} className="flex flex-wrap items-center gap-2">
                  <Link href={`/modules/${a.module.id}`} className="underline underline-offset-2">
                    {a.module.name}
                  </Link>
                  <AlertBadge alert={a} />
                </li>
              ))}
              {alerts.length > 5 ? (
                <li className="text-muted-foreground">+ {othersLabel(alerts.length - 5)}</li>
              ) : null}
            </ul>
          )}
        </StatCard>

        <StatCard
          title="Facturation"
          chip="bg-mint/15 text-mint"
          icon={<Receipt aria-hidden className="size-5" />}
        >
          <dl className="space-y-1 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Prêts à facturer</dt>
              <dd className="font-heading text-xl font-bold">{toInvoice.length}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">À envoyer</dt>
              <dd className="font-heading text-xl font-bold">{toSend.length}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted-foreground">Paiements attendus</dt>
              <dd className="font-heading text-xl font-bold">{toCollect.length}</dd>
            </div>
          </dl>
          <Link href="/billing" className="mt-2 inline-block text-sm underline underline-offset-2">
            Voir la facturation
          </Link>
        </StatCard>
      </div>
    </div>
  );
}
