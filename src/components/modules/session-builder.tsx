"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

import { saveSessionPlan } from "@/app/(app)/modules/[id]/build/actions";
import { ActionError } from "@/components/action-error";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DELIVERABLE_MAX,
  moveDown,
  moveUp,
  SESSION_STATUS_LABELS,
  sessionStatus,
  type SessionStatus,
} from "@/lib/modules/session-builder";

export interface BuilderResource {
  id: string;
  title: string;
}

export interface BuilderCourse {
  id: string;
  title: string;
  date: string | null;
  prepStatus: string;
  completion: string | null;
  deliverable: string;
  resources: BuilderResource[];
}

const VARIANT: Record<SessionStatus, "outline" | "secondary" | "default"> = {
  to_prepare: "outline",
  ready: "secondary",
  done: "default",
};

/** Construire les séances (US-124) : liste à gauche, séance ouverte à droite, enregistrement automatique. */
export function SessionBuilder({
  moduleId,
  courses,
  planAvailable,
}: {
  moduleId: string;
  courses: BuilderCourse[];
  planAvailable: boolean;
}) {
  const [items, setItems] = useState(courses);
  const [openId, setOpenId] = useState(courses[0]?.id ?? "");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = items.find((c) => c.id === openId);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function update(next: BuilderCourse) {
    setItems((list) => list.map((c) => (c.id === next.id ? next : c)));
    setStatus("Enregistrement…");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(async () => {
        const res = await saveSessionPlan(moduleId, next.id, {
          deliverable: next.deliverable,
          resourceOrder: next.resources.map((r) => r.id),
          ready: next.prepStatus === "ready",
        });
        setError(res.error);
        setStatus(
          res.error
            ? ""
            : `Enregistré à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
        );
      });
    }, 600);
  }

  function move(index: number, dir: "up" | "down") {
    if (!current) return;
    const resources =
      dir === "up" ? moveUp(current.resources, index) : moveDown(current.resources, index);
    update({ ...current, resources });
    const target = dir === "up" ? index - 1 : index + 1;
    requestAnimationFrame(() =>
      document
        .getElementById(
          `mv-${current.id}-${resources[Math.max(0, Math.min(target, resources.length - 1))].id}-${dir}`,
        )
        ?.focus(),
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Aucune séance : ajoutes-en une depuis l’onglet Séances.
      </p>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
      <nav aria-label="Séances du module">
        <ul className="space-y-1">
          {items.map((c) => {
            const st = sessionStatus({ prep_status: c.prepStatus, completion: c.completion });
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-current={c.id === openId ? "true" : undefined}
                  onClick={() => setOpenId(c.id)}
                  className="hover:bg-muted aria-[current=true]:bg-muted flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm"
                >
                  <span className="min-w-0 truncate">{c.title}</span>
                  <Badge variant={VARIANT[st]}>{SESSION_STATUS_LABELS[st]}</Badge>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {current ? (
        <section aria-labelledby="open-session" className="space-y-4">
          <h2 id="open-session" className="text-lg font-medium">
            {current.title}
            {current.date ? (
              <span className="text-muted-foreground text-sm"> · {current.date}</span>
            ) : null}
          </h2>

          <div>
            <h3 className="mb-2 text-sm font-medium">Déroulé</h3>
            {current.resources.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Aucune ressource liée.{" "}
                <Link
                  className="underline"
                  href={`/modules/${moduleId}/courses/${current.id}/edit`}
                >
                  Choisir des ressources
                </Link>
              </p>
            ) : (
              <ol className="space-y-1">
                {current.resources.map((r, i, all) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground w-5 tabular-nums">{i + 1}.</span>
                    <span className="min-w-0 flex-1 truncate">{r.title}</span>
                    <button
                      id={`mv-${current.id}-${r.id}-up`}
                      type="button"
                      disabled={!planAvailable || i === 0}
                      onClick={() => move(i, "up")}
                      aria-label={`Monter « ${r.title} »`}
                      className="hover:bg-muted rounded p-1 disabled:opacity-40"
                    >
                      <ArrowUp aria-hidden className="size-4" />
                    </button>
                    <button
                      id={`mv-${current.id}-${r.id}-down`}
                      type="button"
                      disabled={!planAvailable || i === all.length - 1}
                      onClick={() => move(i, "down")}
                      aria-label={`Descendre « ${r.title} »`}
                      className="hover:bg-muted rounded p-1 disabled:opacity-40"
                    >
                      <ArrowDown aria-hidden className="size-4" />
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {planAvailable ? (
            <>
              <div className="space-y-1">
                <Label htmlFor="deliverable">Livrable de la séance</Label>
                <Textarea
                  id="deliverable"
                  rows={3}
                  maxLength={DELIVERABLE_MAX}
                  value={current.deliverable}
                  onChange={(e) => update({ ...current, deliverable: e.target.value })}
                />
                <p className="text-muted-foreground text-xs">
                  Ce que les étudiant·es rendent ou gardent à la fin.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={current.prepStatus === "ready"}
                  onChange={(e) =>
                    update({ ...current, prepStatus: e.target.checked ? "ready" : "todo" })
                  }
                />
                Cette séance est prête
              </label>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              L’ordre et le livrable seront disponibles après la prochaine mise à jour de la base.
            </p>
          )}

          <p role="status" aria-live="polite" className="text-muted-foreground min-h-5 text-sm">
            {status}
          </p>
          {error ? <ActionError error={error} /> : null}
        </section>
      ) : null}
    </div>
  );
}
