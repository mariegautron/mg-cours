import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/ui/back-link";
import { EmptyState } from "@/components/empty-state";
import {
  CHECKPOINT_STATUS_LABEL,
  formatCheckpointDate,
  isCheckpointStatus,
  type CheckpointStatus,
} from "@/lib/checkpoints/checkpoints";
import {
  listCheckpointResults,
  listCheckpoints,
  listModuleStudents,
} from "@/lib/checkpoints/queries";
import { getModule } from "@/lib/modules/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Jalons" };

const TONE: Record<CheckpointStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  submitted: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  validated: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  refused: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100",
};

/** Jalons non notés : qui a rendu quoi, où en est le retour. Rien n'entre dans une moyenne. */
export default async function CheckpointsPage({ params }: PageProps<"/modules/[id]/jalons">) {
  const { id } = await params;
  const mod = await getModule(id);
  if (!mod) notFound();
  const [checkpoints, students] = await Promise.all([listCheckpoints(id), listModuleStudents(id)]);
  const results = await listCheckpointResults(checkpoints.map((c) => c.id));
  const byKey = new Map(results.map((r) => [`${r.checkpoint_id}:${r.student_id}`, r]));

  return (
    <div className="space-y-6">
      <BackLink href={`/modules/${mod.id}`}>{mod.name}</BackLink>
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-bold">Jalons</h1>
        <p className="text-muted-foreground text-sm">
          Suivi des points de contrôle, sans note : rien ici n’entre dans une moyenne.
        </p>
      </header>

      {checkpoints.length === 0 || students.length === 0 ? (
        <EmptyState
          title={checkpoints.length === 0 ? "Aucun jalon pour ce module" : "Aucun·e étudiant·e"}
          description={
            checkpoints.length === 0
              ? "Les jalons de ce module n’ont pas encore été créés."
              : "Ajoute des étudiant·es au groupe du module pour suivre leurs jalons."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full text-sm">
            <caption className="sr-only">
              État des jalons par étudiant·e. Chaque état est un lien vers le détail.
            </caption>
            <thead>
              <tr className="bg-muted/50">
                <th scope="col" className="p-3 text-left font-semibold">
                  Étudiant·e
                </th>
                {checkpoints.map((c) => (
                  <th
                    key={c.id}
                    scope="col"
                    className="min-w-36 p-3 text-left align-top font-semibold"
                  >
                    <span className="block">{c.code}</span>
                    <span className="block font-normal">{c.title}</span>
                    {c.due_date ? (
                      <span className="text-muted-foreground block text-xs font-normal">
                        À rendre le {formatCheckpointDate(c.due_date)}
                      </span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t">
                  <th scope="row" className="p-3 text-left font-medium whitespace-nowrap">
                    {s.first_name} {s.last_name}
                  </th>
                  {checkpoints.map((c) => {
                    const r = byKey.get(`${c.id}:${s.id}`);
                    const status: CheckpointStatus = isCheckpointStatus(r?.status)
                      ? r.status
                      : "pending";
                    const date = formatCheckpointDate(
                      (r?.decided_at ?? r?.submitted_at)?.slice(0, 10),
                    );
                    return (
                      <td key={c.id} className="p-2 align-top">
                        <Link
                          href={`/modules/${mod.id}/jalons/${c.id}/${s.id}`}
                          className="focus-visible:ring-ring hover:bg-accent block min-h-11 rounded-xl p-1.5 focus-visible:ring-2 focus-visible:outline-none"
                        >
                          <span
                            className={cn(
                              "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              TONE[status],
                            )}
                          >
                            {CHECKPOINT_STATUS_LABEL[status]}
                          </span>
                          {date ? (
                            <span className="text-muted-foreground block text-xs">{date}</span>
                          ) : null}
                          <span className="sr-only">
                            {" "}
                            — {c.code}, {s.first_name} {s.last_name}
                          </span>
                        </Link>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
