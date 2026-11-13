"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { setLeftModule } from "@/app/(app)/modules/[id]/groups/actions";
import { ActionError } from "@/components/action-error";
import { NewMemberForm } from "@/components/students/group-members";

export interface RosterRow {
  id: string;
  name: string;
  groups: string[];
  leftAt: string | null;
}

const dayLabel = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

/** Inscrit·es du module, avec leur groupe ; « A quitté le module » garde la personne, grisée. */
export function ModuleRoster({ moduleId, rows }: { moduleId: string; rows: RosterRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);
  const active = rows.filter((r) => !r.leftAt);

  const toggle = (row: RosterRow) => {
    setBusy(row.id);
    setError("");
    start(async () => {
      const res = await setLeftModule(moduleId, row.id, !row.leftAt);
      setBusy(null);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <section aria-labelledby="roster" className="rounded-lg border p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="roster" className="text-sm font-semibold">
          Inscrit·es · {active.length}
          {rows.length > active.length ? (
            <span className="text-muted-foreground text-sm font-normal">
              {" "}
              (+ {rows.length - active.length} parti·e{rows.length - active.length > 1 ? "s" : ""})
            </span>
          ) : null}
        </h2>
      </div>
      {created ? (
        <p role="status" className="mb-2 rounded-md border p-2 text-sm">
          {created.name} est inscrit·e. Pense à lui créer son lien d’espace étudiant·e :{" "}
          <Link href={`/students/${created.id}`} className="underline underline-offset-2">
            créer le lien
          </Link>
          .
        </p>
      ) : null}
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">Personne n’est encore inscrit·e.</p>
      ) : (
        <ul className="divide-y text-sm">
          {rows.map((r) => (
            <li
              key={r.id}
              className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2 ${r.leftAt ? "opacity-60" : ""}`}
            >
              <Link
                href={`/students/${r.id}`}
                className="min-w-40 flex-1 underline underline-offset-2"
              >
                {r.name}
              </Link>
              <span className="text-muted-foreground">
                {r.leftAt
                  ? `a quitté le module le ${dayLabel(r.leftAt)}`
                  : r.groups.length
                    ? r.groups.join(", ")
                    : "sans groupe"}
              </span>
              <button
                type="button"
                disabled={pending}
                aria-busy={busy === r.id || undefined}
                onClick={() => toggle(r)}
                className="hover:bg-accent min-h-9 rounded-lg border px-2 text-xs font-semibold"
              >
                {r.leftAt ? "Annuler le départ" : "A quitté le module"}
                <span className="sr-only"> : {r.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <NewMemberForm
          moduleId={moduleId}
          groupId={null}
          initial=""
          onCreated={(c) => {
            setCreated(c);
            router.refresh();
          }}
        />
      </div>
      {error ? <ActionError error={error} /> : null}
    </section>
  );
}
