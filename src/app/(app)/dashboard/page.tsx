import type { Metadata } from "next";
import Link from "next/link";
import { BookMarked, CalendarCheck, NotebookPen, Play, Receipt, TimerReset } from "lucide-react";

import { Mascot } from "@/components/mascot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listCoursesOn } from "@/lib/dashboard/queries";
import { todaySessions } from "@/lib/dashboard/today";
import { formatTimeRange } from "@/lib/modules/course-duration";
import { listBillingOverview } from "@/lib/invoice/queries";
import { todayInParis } from "@/lib/modules/next-session";
import { listModules } from "@/lib/modules/queries";
import { getProfile } from "@/lib/settings/queries";
import { outlineAlerts, outlineAlertSummary, type OutlineAlert } from "@/lib/ynov/trame";

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
  const [modules, billing, profile, coursesToday] = await Promise.all([
    listModules(),
    listBillingOverview(),
    getProfile(),
    listCoursesOn(today),
  ]);
  const sessions = todaySessions(coursesToday, today);
  const toInvoice = billing.filter((b) => b.kind === "ready");
  const toSend = billing.filter((b) => b.kind === "invoiced" && b.invoice.status === "ready");
  const toCollect = billing.filter((b) => b.kind === "invoiced" && b.invoice.status === "sent");
  const alerts = outlineAlerts(modules);
  const summary = outlineAlertSummary(alerts);

  const firstName = profile?.legal_name?.split(" ")[0];

  return (
    <div className="space-y-8">
      <div className="bg-card halo relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl border p-6 sm:p-8">
        <div
          aria-hidden
          className="bg-violet/20 pointer-events-none absolute -top-16 -right-10 size-64 rounded-full blur-3xl"
        />
        <div className="relative max-w-xl space-y-2">
          <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            {firstName ? `Bonjour ${firstName} !` : "Bonjour !"}
          </h1>
          <p className="text-muted-foreground text-base">
            {summary === "pressing"
              ? "Une progression pédagogique demande ton attention avant l’échéance."
              : summary === "upcoming"
                ? "Une progression pédagogique est à préparer : échéance dans moins de 15 jours."
                : "Tout est en ordre. Voici l’essentiel de ta rentrée."}
          </p>
        </div>
        <Mascot
          mood={summary === "none" ? "party" : "alert"}
          className="relative size-28 sm:size-32"
        />
      </div>

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
            {sessions.map((c) => (
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
      ) : null}

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
            <p className="text-muted-foreground text-sm">Aucune échéance dans les 15 jours.</p>
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
                <li className="text-muted-foreground">+ {alerts.length - 5} autre(s)</li>
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
