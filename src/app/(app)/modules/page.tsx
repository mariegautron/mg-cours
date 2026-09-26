import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { listModules } from "@/lib/modules/queries";
import { requiredNotes } from "@/lib/ynov/notation";
import { trameStatus } from "@/lib/ynov/trame";

export const metadata: Metadata = { title: "Modules" };

const TRAME_BADGE: Record<
  string,
  { label: string; variant: "default" | "destructive" | "outline" | "secondary" }
> = {
  sent: { label: "Trame envoyée", variant: "secondary" },
  overdue: { label: "Trame en retard", variant: "destructive" },
  urgent: { label: "Trame — J-7", variant: "destructive" },
  warning: { label: "Trame — J-15", variant: "outline" },
  ok: { label: "Trame OK", variant: "outline" },
  unknown: { label: "1re séance à renseigner", variant: "outline" },
};

export default async function ModulesPage() {
  const modules = await listModules();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Modules</h1>
          <p className="text-muted-foreground">
            Tous vos modules, toutes écoles et toutes années confondues.
          </p>
        </div>
        <Button asChild>
          <Link href="/modules/new">
            <Plus aria-hidden />
            Nouveau module
          </Link>
        </Button>
      </div>

      {modules.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Aucun module</EmptyTitle>
            <EmptyDescription>Créez votre premier module pour commencer.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/modules/new">Nouveau module</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => {
            const notes = requiredNotes(m.total_hours);
            const trame = trameStatus(m.first_session_date, m.iceberg_state);
            const badge = TRAME_BADGE[trame.level];
            return (
              <li key={m.id}>
                <Link
                  href={`/modules/${m.id}`}
                  className="hover:bg-accent focus-visible:ring-ring block h-full rounded-lg border p-4 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <h2 className="font-medium">{m.name}</h2>
                  <p className="text-muted-foreground text-sm">
                    {m.school?.name ?? "École non renseignée"} · {m.level ?? "—"} · {m.year}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Badge variant="secondary">{m.total_hours} h</Badge>
                    <Badge variant="outline">
                      {notes.total} note{notes.total > 1 ? "s" : ""} min.
                    </Badge>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
