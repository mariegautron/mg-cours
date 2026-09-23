import type { Metadata } from "next";
import Link from "next/link";
import { BookMarked, Receipt, TimerReset } from "lucide-react";

import { Mascot } from "@/components/mascot";
import { Badge } from "@/components/ui/badge";
import { listBillingOverview } from "@/lib/invoice/queries";
import { listModules } from "@/lib/modules/queries";
import { getProfile } from "@/lib/settings/queries";
import { trameStatus } from "@/lib/ynov/trame";

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

export default async function DashboardPage() {
  const [modules, billing, profile] = await Promise.all([
    listModules(),
    listBillingOverview(),
    getProfile(),
  ]);
  const toInvoice = billing.filter((b) => b.kind === "ready");
  const toSend = billing.filter((b) => b.kind === "invoiced" && b.invoice.status === "ready");
  const toCollect = billing.filter((b) => b.kind === "invoiced" && b.invoice.status === "sent");
  const trames = modules
    .map((m) => ({ module: m, status: trameStatus(m.first_session_date, m.iceberg_state) }))
    .filter((t) => t.status.level === "urgent" || t.status.level === "overdue")
    .sort((a, b) => (a.status.daysUntilDue ?? 0) - (b.status.daysUntilDue ?? 0));

  const firstName = profile?.legal_name?.split(" ")[0];
  const urgent = trames.length > 0;

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
            {urgent
              ? "Une trame demande ton attention avant l’échéance."
              : "Tout est en ordre. Voici l’essentiel de ta rentrée."}
          </p>
        </div>
        <Mascot mood={urgent ? "alert" : "party"} className="relative size-28 sm:size-32" />
      </div>

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
          title="Trames urgentes"
          chip="bg-sun/15 text-sun"
          icon={<TimerReset aria-hidden className="size-5" />}
        >
          {trames.length === 0 ? (
            <p className="text-muted-foreground text-sm">Rien d’urgent pour l’instant.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {trames.slice(0, 5).map((t) => (
                <li key={t.module.id} className="flex flex-wrap items-center gap-2">
                  <Link href={`/modules/${t.module.id}`} className="underline underline-offset-2">
                    {t.module.name}
                  </Link>
                  <Badge variant="destructive">
                    {t.status.level === "overdue"
                      ? `en retard de ${Math.abs(t.status.daysUntilDue ?? 0)} j`
                      : `J-${t.status.daysUntilDue}`}
                  </Badge>
                </li>
              ))}
              {trames.length > 5 ? (
                <li className="text-muted-foreground">+ {trames.length - 5} autre(s)</li>
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
