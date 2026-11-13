import { getAppreciationProgress } from "@/lib/appreciations/queries";
import { invoiceProgress } from "@/lib/invoice/simple";
import { getModuleJourney } from "@/lib/modules/journey-queries";
import {
  moduleLabels,
  relabelModules,
  dropHiddenModules,
  isHiddenFromToday,
} from "@/lib/dashboard/module-labels";
import { seeOthers } from "@/lib/plural";
import { displayFirstName } from "@/lib/ynov/teacher-name";
import type { Metadata } from "next";
import Link from "next/link";
import { Play } from "lucide-react";

import { Pill } from "@/components/dashboard/pill";
import { TodayPrep } from "@/components/dashboard/today-prep";
import { WeekCard } from "@/components/dashboard/week-card";
import {
  listCourseProgress,
  listToCorrect,
  loadCourseAssessments,
  loadFocusKpis,
  loadPreviousSession,
} from "@/lib/dashboard/overview-queries";
import { dayLine, dayTile, untilLabel } from "@/lib/dashboard/overview";
import { CopyMessageButton } from "@/components/projects/copy-message-button";
import { listSurprisesForCourses } from "@/lib/projects/surprise-queries";
import { copyText, dueToday } from "@/lib/projects/surprises";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";
import {
  getSessionPrep,
  listCoursesAfter,
  listCoursesBetween,
  listCoursesOn,
  listResumeCandidates,
} from "@/lib/dashboard/queries";
import { formatWhen, pickResume, RESUME_LABELS } from "@/lib/dashboard/resume";
import { UpcomingAssessmentsCard } from "@/components/assessments/upcoming-assessments-card";
import { listUpcomingAssessments } from "@/lib/assessments/day-j-queries";
import { buildTodos, pickTodos, type TodoSources } from "@/lib/dashboard/todo";
import { createClient } from "@/lib/supabase/server";
import {
  formatSessionDay,
  nextSession,
  remainingSessions,
  timeInParis,
  todaySessions,
} from "@/lib/dashboard/today";
import { daysBetween, weekDays, weekRange } from "@/lib/dashboard/week";
import { formatTimeRange } from "@/lib/modules/course-duration";
import { listBillingOverview } from "@/lib/invoice/queries";
import { todayInParis } from "@/lib/modules/next-session";
import { listModules } from "@/lib/modules/queries";
import { listOutlineSentModuleIds } from "@/lib/outline/queries";
import { inFilter, moduleListState } from "@/lib/modules/list-state";
import { getProfile } from "@/lib/settings/queries";
import { outlineAlerts } from "@/lib/ynov/trame";
import { sessionHeading } from "@/lib/plural";

export const metadata: Metadata = { title: "Tableau de bord" };

// Boutons de la page : composants de base (DA « Atelier »). Actions de ligne en « ghost »,
// actions d'une carte en « secondary », une seule action pleine par zone.
const BTN = buttonVariants({ variant: "ghost" });
const BTN_2 = buttonVariants({ variant: "secondary" });
const BTN_1 = buttonVariants();

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
    toCorrect,
  ] = await Promise.all([
    listModules(),
    listBillingOverview(),
    getProfile(),
    listCoursesOn(today),
    // Listes chargées sans coupe serrée : les modules masqués sont retirés AVANT de couper.
    listCoursesAfter(today, 80),
    listCoursesBetween(week.from, week.to),
    listResumeCandidates(),
    listCourseProgress(),
    listToCorrect(Number.MAX_SAFE_INTEGER),
  ]);
  // Modules masqués d'Aujourd'hui (modules de test…) : ils ne comptent nulle part sur cette page.
  // Calculé sur tous les modules, archivés compris (facture, rattrapages d'un module terminé).
  const allModules = await listModules({ includeArchived: true });
  const hiddenIds = new Set(allModules.filter((m) => isHiddenFromToday(m)).map((m) => m.id));
  for (let i = modules.length - 1; i >= 0; i--)
    if (hiddenIds.has(modules[i].id)) modules.splice(i, 1);
  for (const list of [
    coursesToday,
    coursesAfter,
    coursesWeek,
    toCorrect,
    resumeCandidates,
    billing,
  ])
    if (Array.isArray(list)) dropHiddenModules(list as object[], hiddenIds);
  toCorrect.splice(3);
  // Deux modules du même nom (copie d'une année sur l'autre) : l'année scolaire les distingue.
  const labels = moduleLabels(allModules);
  for (const m of modules) m.name = labels.get(m.id) ?? m.name;
  relabelModules(billing, labels);
  relabelModules(coursesToday, labels);
  relabelModules(coursesAfter, labels);
  relabelModules(coursesWeek, labels);
  relabelModules(toCorrect, labels);
  const resume = pickResume(resumeCandidates);
  // Une séance clôturée passe en « faite » : la carte principale montre la prochaine à faire.
  const todayAll = todaySessions(coursesToday, today);
  const doneToday = todayAll.filter((c) => c.completion);
  const sessions = remainingSessions(
    todayAll.filter((c) => !c.completion),
    timeInParis(),
  ).filter((c) => !c.completion);
  // Bandeau « prochain cours » : un module déjà commencé, ou une séance dans les 7 jours. Un module
  // « à préparer » plus lointain passe dans « À faire » (« Préparer la séance 1 de X, dans 21 jours »).
  const started = (moduleId: string) => (progress.get(moduleId)?.done ?? 0) > 0;
  const upcoming = sessions.length
    ? null
    : nextSession(
        coursesAfter.filter(
          (c) =>
            !!c.module &&
            !!c.session_date &&
            (started(c.module.id) || daysBetween(today, c.session_date) <= 7),
        ),
        today,
      );
  const farFirst = sessions.length ? null : nextSession(coursesAfter, today);
  const farPrep =
    farFirst && farFirst.id !== upcoming?.id && !started(farFirst.module.id) ? farFirst : null;
  // « Progression envoyée » : la même définition partout (isOutlineSent), pas l'état iceberg.
  const outlineSentIds = await listOutlineSentModuleIds(modules);
  const alerts = outlineAlerts(
    modules.map((m) => ({ ...m, outline_sent: outlineSentIds.has(m.id) })),
  );
  const firstName = displayFirstName(profile?.legal_name);

  const upcomingEvals = dropHiddenModules(
    relabelModules(await listUpcomingAssessments(today, 14), labels),
    hiddenIds,
  );
  // Séances des 14 derniers jours jamais clôturées (modules en cours) : « Clôturer » d'abord.
  const twoWeeksAgo = new Date(Date.parse(`${today}T12:00:00Z`) - 14 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - 86_400_000)
    .toISOString()
    .slice(0, 10);
  const activeIds = new Set(
    modules.filter((m) => !m.archived_at && !m.finished_at).map((m) => m.id),
  );
  const toClose = (await listCoursesBetween(twoWeeksAgo, yesterday))
    .filter((c) => !c.completion && c.module && activeIds.has(c.module.id) && c.session_date)
    .map((c) => ({
      id: c.id,
      position: c.position,
      session_date: c.session_date!,
      module: { id: c.module!.id, name: c.module!.name },
    }));
  // « Ce qu'il reste à faire » d'un module en cours : son étape courante d'Où j'en suis (D12), même
  // calcul que la fiche du module et la liste des modules. L'échéance de la progression donne
  // l'urgence de l'étape « envoyer la progression ».
  const alertDays = new Map(alerts.map((a) => [a.module.id, a.daysUntilDue]));
  const steps = (
    await Promise.all(
      modules
        .filter((m) => activeIds.has(m.id))
        .map(async (m) => {
          const current = (await getModuleJourney(m.id))?.current;
          // « Faire cours » : la séance à préparer ou à clôturer le dit déjà, plus précisément.
          if (!current || current.key === "teach") return null;
          return {
            module: { id: m.id, name: m.name },
            key: current.key,
            badge: current.badge,
            summary: current.summary,
            href: current.action.href,
            urgency:
              current.key === "send" || current.key === "outline" ? (alertDays.get(m.id) ?? 8) : 8,
          };
        }),
    )
  ).filter((x): x is NonNullable<typeof x> => x !== null);
  const preps = await Promise.all(sessions.map((c) => getSessionPrep(c.module.id, c.id)));
  // Imprévus du client à envoyer aujourd'hui (US-128) : séances du jour, pas encore envoyés.
  const todayIds = new Set(sessions.map((c) => c.id));
  const surprises = relabelModules(
    dueToday(await listSurprisesForCourses([...todayIds]), todayIds),
    labels,
  );

  const appreciationTodos = (
    await Promise.all(
      modules
        .filter((m) => !m.archived_at && !m.finished_at)
        .map(async (m) => ({
          module: { id: m.id, name: m.name },
          p: await getAppreciationProgress(m.id),
        })),
    )
  ).flatMap((x) =>
    x.p.allGraded && x.p.total > x.p.written
      ? [{ module: x.module, remaining: x.p.total - x.p.written }]
      : [],
  );
  const allTodos = pickTodos(
    buildTodos({
      today,
      toClose,
      steps,
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
      assessments: upcomingEvals
        .filter((a) => a.missing.length > 0)
        .map((a) => ({
          id: a.id,
          title: a.title,
          date: a.date,
          moduleId: a.moduleId,
          moduleName: a.moduleName,
          missingCount: a.missing.length,
        })),
      // Facture : seulement pour un module terminé ; en cours, c'est une étape (« Facturer »).
      billing: billing
        .filter((b) => !activeIds.has(b.module.id))
        // « Envoyée » / « Payée » : la même source que partout (invoiceProgress, lot 8).
        .flatMap<TodoSources["billing"][number]>((b) => {
          const progress = invoiceProgress(b.module);
          if (progress === "paid") return [];
          if (progress === "sent") return [{ module: b.module, kind: "toCollect" as const }];
          if (b.kind === "invoiced" && b.invoice.status === "ready")
            return [{ module: b.module, kind: "toSend" as const }];
          // Ni envoyée ni payée : Marie facture hors de l'appli (dépôt du PDF, puis « Envoyée ») ;
          // les blocages de l'ancienne facture électronique ne cachent plus la carte.
          return [{ module: b.module, kind: "ready" as const }];
        }),
    }),
    Number.POSITIVE_INFINITY,
  );
  if (farPrep) {
    const d = daysBetween(today, farPrep.session_date!);
    allTodos.push({
      key: `far-prep-${farPrep.id}`,
      kind: "session_prep",
      title: `Préparer la séance ${farPrep.position} de ${farPrep.module.name}`,
      detail: `dans ${d} jours`,
      href: `/modules/${farPrep.module.id}/courses/${farPrep.id}#deroule`,
      urgency: d,
    });
  }
  // Les 3 plus urgentes ; les autres se déplient (« Voir les N autres »).
  const todos = allTodos.slice(0, 3);
  const moreTodos = allTodos.slice(3);
  const { days, nextWeek } = weekDays(
    today,
    coursesWeek.filter((c) => c.module && !c.module.archived_at),
  );
  const doneIds = new Set(
    coursesWeek.filter((c) => c.session_date && c.session_date < today).map((c) => c.id),
  );
  // Rattrapages datés cette semaine : visibles dans le jour (pas sur la frise publique).
  const supabaseWeek = await createClient();
  const { data: weekMakeups } = await supabaseWeek
    .from("assessment")
    .select("id, title, date, module_id, module:module_id(archived_at, finished_at)")
    .not("makeup_of_id", "is", null)
    .gte("date", days[0].date)
    .lte("date", days[days.length - 1].date);
  const makeupDays = new Map<string, number>();
  for (const a of (weekMakeups ?? []) as unknown as {
    date: string | null;
    module_id: string;
    module: { archived_at: string | null } | null;
  }[]) {
    if (!a.date || a.module?.archived_at || hiddenIds.has(a.module_id)) continue;
    const d = a.date.slice(0, 10);
    makeupDays.set(d, (makeupDays.get(d) ?? 0) + 1);
  }
  const tiles = days.map((d) => {
    const tile = dayTile(d, today, (c) => doneIds.has(c.id));
    const n = makeupDays.get(d.date) ?? 0;
    if (n === 0) return tile;
    const label = `${n} rattrapage${n > 1 ? "s" : ""}`;
    return {
      ...tile,
      state: tile.state === "empty" && d.date >= today ? ("upcoming" as const) : tile.state,
      mark: tile.mark || "▲",
      caption: tile.caption ? `${tile.caption} · ${label}` : label,
    };
  });
  const hrefs = days.map((d) => {
    // Un jour à plusieurs séances mène à la première non clôturée, sinon à la première.
    const c = d.courses.find((x) => !x.completion && x.module) ?? d.courses[0];
    return c?.module
      ? `/modules/${c.module.id}/courses/${c.id}/${c.session_date === today ? "start" : "edit"}`
      : null;
  });
  const activeModules = modules.filter((m) => !m.archived_at && !m.finished_at);
  // Même définition que le filtre « En cours » de la page Modules.
  const runningModules = modules.filter((m) =>
    inFilter(
      moduleListState({
        ...m,
        courses: { done: progress.get(m.id)?.done ?? 0, total: progress.get(m.id)?.total ?? 0 },
      }),
      "running",
    ),
  );

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
    <section aria-labelledby="todo" className="bg-card rounded-xl border px-5 py-4">
      <h2 id="todo" className="mb-1 text-sm font-semibold">
        À faire <span className="text-muted-foreground-2 font-normal">{allTodos.length}</span>
      </h2>
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
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  className="bg-muted text-muted-foreground flex size-[22px] shrink-0 items-center justify-center rounded-sm text-xs font-medium"
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
      {moreTodos.length > 0 ? (
        <details className="border-t pt-2">
          <summary className="text-muted-foreground min-h-11 cursor-pointer py-2 text-sm font-semibold">
            {seeOthers(moreTodos.length)}
          </summary>
          <ol>
            {moreTodos.map((t) => (
              <li
                key={t.key}
                className="flex min-h-14 items-center justify-between gap-3 border-t py-2"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-muted-foreground text-sm">{t.detail}</p>
                </div>
                <Link href={t.href} className={`${BTN} shrink-0`}>
                  Ouvrir<span className="sr-only"> : {t.title}</span>
                </Link>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </section>
  );

  const doneTodayCard = doneToday.length ? (
    <section aria-labelledby="done-today" className="bg-card rounded-xl border px-5 py-4">
      <h2 id="done-today" className="text-sm font-semibold">
        Faite{doneToday.length > 1 ? "s" : ""} aujourd’hui
      </h2>
      <ul>
        {doneToday.map((c) => (
          <li
            key={c.id}
            className="text-muted-foreground flex flex-wrap items-center justify-between gap-4 border-t py-3 first:border-t-0"
          >
            <p>
              {c.title} · {c.module.name}
            </p>
            <Pill tone="ok">Faite</Pill>
          </li>
        ))}
      </ul>
    </section>
  ) : null;

  const surprisesCard = surprises.length ? (
    <section aria-labelledby="surprises" className="bg-card rounded-xl border px-5 py-4">
      <h2 id="surprises" className="mb-2 text-sm font-semibold">
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
    <section aria-labelledby="resume" className="bg-card rounded-xl border px-5 py-4">
      <div>
        <div>
          <h2 id="resume" className="text-sm font-semibold">
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

  const correctCard =
    toCorrect.length > 0 ? (
      <section aria-labelledby="corr" className="bg-card rounded-xl border px-5 py-4">
        <h2 id="corr" className="mb-2 text-sm font-semibold">
          À corriger
        </h2>
        <ul className="space-y-3">
          {toCorrect.map((c) => (
            <li key={c.assessmentId} className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{c.title}</p>
                <p className="text-muted-foreground text-sm">
                  {c.moduleName} · {c.remaining} copie{c.remaining > 1 ? "s" : ""} restante
                  {c.remaining > 1 ? "s" : ""} sur {c.total}
                  {c.inProgress > 0 ? ` · ${c.inProgress} en cours` : ""}
                  {c.date ? ` · épreuve du ${new Date(c.date).toLocaleDateString("fr-FR")}` : ""}
                </p>
              </div>
              <Link
                href={`/modules/${c.moduleId}/assessments/${c.assessmentId}/correct${
                  c.nextCopyId ? `?copy=${c.nextCopyId}` : ""
                }`}
                className={BTN}
              >
                Corriger<span className="sr-only"> : {c.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  const upcomingEvalsCard = <UpcomingAssessmentsCard items={upcomingEvals} />;

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
    // Heure de fin passée et séance pas clôturée : on propose de clôturer.
    const heroEnded =
      !hero.completion && !!hero.end_time && hero.end_time.slice(0, 5) <= timeInParis();
    return (
      <div className="space-y-5">
        {passwordChanged ? (
          <p role="status" className="text-success text-sm font-semibold">
            Mot de passe changé. Tu es connectée.
          </p>
        ) : null}
        <header>
          <h1 className="text-xl">Aujourd’hui · {dayText}</h1>
          <p className="text-muted-foreground mt-1.5">
            Ta journée en un coup d’œil : la séance en cours, ce qu’il faut savoir avant d’entrer,
            ce qui vient après.
          </p>
        </header>

        <section
          aria-labelledby="seance"
          className="bg-card card-featured rounded-xl border px-5 py-4 sm:p-5"
        >
          <div className="min-w-0">
            <p className="text-muted-foreground mb-1.5 text-[13px] font-medium">
              {range ? `${range} · ` : ""}Séance {prep.number} sur {prep.total} · {hero.module.name}
            </p>
            <h2 id="seance" className="title-display text-xl">
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
            {/* Boutons en ligne sous le titre : visibles sans défiler à 1366 × 768, zoom 125 %. */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={
                  heroEnded
                    ? `/modules/${hero.module.id}/courses/${hero.id}/close`
                    : `/modules/${hero.module.id}/courses/${hero.id}/start`
                }
                className={BTN_1}
              >
                {heroEnded ? null : <Play aria-hidden className="size-4" />}
                {heroEnded ? "Clôturer la séance" : "Commencer le cours"}
                <span className="sr-only"> : {hero.title}</span>
                <span aria-hidden> →</span>
              </Link>
              {heroEnded ? (
                <Link
                  href={`/modules/${hero.module.id}/courses/${hero.id}/start`}
                  className={BTN_2}
                >
                  Rouvrir la séance<span className="sr-only"> : {hero.title}</span>
                </Link>
              ) : (
                <a
                  href="https://edusign.app/professor/home"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={BTN_2}
                >
                  Ouvrir Edusign<span className="sr-only"> (nouvel onglet)</span>
                </a>
              )}
            </div>
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

        {doneTodayCard}

        {sessions.length > 1 ? (
          <section aria-labelledby="after" className="bg-card rounded-xl border px-5 py-4">
            <h2 id="after" className="text-sm font-semibold">
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
                    <Link href={`/modules/${c.module.id}/courses/${c.id}/start`} className={BTN}>
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
            {correctCard}
            {upcomingEvalsCard}
            {weekCard}
            {resumeCard}
          </div>
        </div>
      </div>
    );
  }

  // Compteurs de la ligne du haut : tous les modules en cours.
  const runningIds = new Set(runningModules.map((m) => m.id));
  const weekRunning = coursesWeek.filter((c) => c.module && runningIds.has(c.module.id));
  const { count: weekObservations } = await (
    await createClient()
  )
    .from("student_observation")
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${week.from}T00:00:00`);
  return (
    <div className="space-y-5">
      {passwordChanged ? (
        <p role="status" className="text-success text-sm font-semibold">
          Mot de passe changé. Tu es connectée.
        </p>
      ) : null}
      {/* Margot sort de l'en-tête (DA « Atelier ») : elle reste dans le logo et les écrans vides. */}
      <header>
        <div>
          <h1>{firstName ? `Bonjour ${firstName}` : "Bonjour"}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {dayLine(
              dayText,
              0,
              upcoming && nextUntil ? { daysUntil: nextUntil, position: upcoming.position } : null,
            )}
          </p>
        </div>
      </header>

      {/* Bande de chiffres : 4 cases égales dans un seul cadre (DA « Atelier »). */}
      <dl
        role="status"
        className="bg-card grid grid-cols-2 divide-x divide-y rounded-xl border sm:grid-cols-4 sm:divide-y-0"
      >
        {[
          {
            label: `module${runningModules.length > 1 ? "s" : ""} en cours`,
            value: String(runningModules.length),
          },
          {
            label: "séances faites cette semaine",
            value:
              weekRunning.length === 0
                ? "—"
                : `${weekRunning.filter((c) => c.completion).length} / ${weekRunning.length}`,
          },
          {
            label: "appréciations à écrire",
            value: String(appreciationTodos.reduce((n, a) => n + a.remaining, 0)),
          },
          { label: "observations cette semaine", value: String(weekObservations) },
        ].map((k) => (
          <div key={k.label} className="flex flex-col-reverse gap-1 px-4 py-3">
            <dt className="text-muted-foreground text-[13px]">{k.label}</dt>
            <dd className="text-foreground text-xl font-semibold tabular-nums">{k.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-start gap-4 lg:flex-nowrap">
        <div className="min-w-0 flex-1 basis-full space-y-3 lg:basis-0">
          {doneTodayCard}
          {/* « À faire » d'abord : visible sans défiler à 125 %, avant la carte du prochain cours. */}
          {todoCard}
          {upcoming ? (
            <section
              aria-labelledby="next"
              className="bg-card card-featured rounded-xl border px-5 py-4"
            >
              <p className="mb-1.5 flex flex-wrap items-center gap-2">
                <Pill tone="wip">{untilLabel(today, upcoming.session_date!)}</Pill>
                <span className="text-muted-foreground text-sm">
                  {formatSessionDay(upcoming.session_date!)}
                  {formatTimeRange(upcoming.start_time, upcoming.end_time)
                    ? ` · ${formatTimeRange(upcoming.start_time, upcoming.end_time)}`
                    : ""}
                </span>
              </p>
              <h2 id="next" className="title-display text-xl">
                {sessionHeading(upcoming.position, upcoming.title)}
              </h2>
              <p className="text-muted-foreground mt-1 mb-4">
                {upcoming.module.name}
                {focus?.groupNames.length ? ` · ${focus.groupNames.join(", ")}` : ""}
                {focus
                  ? ` · ${focus.students.total} étudiant·e${focus.students.total > 1 ? "s" : ""}`
                  : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/modules/${upcoming.module.id}/courses/${upcoming.id}#deroule`}
                  className={BTN_1}
                >
                  Préparer la séance {upcoming.position}
                </Link>
                <Link href={`/modules/${upcoming.module.id}`} className={BTN_2}>
                  Voir le module
                </Link>
              </div>
            </section>
          ) : (
            <section aria-label="Prochaine séance" className="bg-card rounded-xl border">
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
          {surprisesCard}
        </div>
        <div className="w-full min-w-0 space-y-3.5 lg:w-[440px] lg:flex-none">
          {correctCard}
          {upcomingEvalsCard}
          {weekCard}
          {resumeCard}
        </div>
      </div>
    </div>
  );
}
