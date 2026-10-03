"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";

import {
  removeCourseResource,
  saveWorkspace,
} from "@/app/(app)/modules/[id]/courses/workspace-actions";
import { ActionError } from "@/components/action-error";
import { Pill } from "@/components/dashboard/pill";
import { Textarea } from "@/components/ui/textarea";
import { moveDown, moveUp, reorder } from "@/lib/modules/session-builder";
import { DELIVERABLE_MAX } from "@/lib/modules/session-builder";
import { PREP_STATUS_LABELS, PREP_STATUSES } from "@/lib/modules/schema";
import { cn } from "@/lib/utils";

export interface WorkspaceResource {
  id: string;
  title: string;
  kindLabel: string;
  ready: boolean;
  subtitle: string;
}

const BTN =
  "focus-visible:ring-ring hover:bg-accent inline-flex min-h-11 items-center justify-center rounded-xl border px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none";

/**
 * Séance ouverte (maquette « Séances ») : titre, statut, déroulé réordonnable (glisser-déposer ET
 * boutons monter/descendre), livrable. Enregistrement automatique, annoncé en bas de l'écran.
 */
export function SessionWorkspace({
  moduleId,
  courseId,
  initial,
  planAvailable,
}: {
  moduleId: string;
  courseId: string;
  initial: {
    title: string;
    prepStatus: string;
    deliverable: string;
    resources: WorkspaceResource[];
  };
  planAvailable: boolean;
}) {
  const [title, setTitle] = useState(initial.title);
  const [status, setStatus] = useState(initial.prepStatus);
  const [deliverable, setDeliverable] = useState(initial.deliverable);
  const [resources, setResources] = useState(initial.resources);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [announce, setAnnounce] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [, start] = useTransition();
  const first = useRef(true);

  // Enregistrement automatique : 700 ms après le dernier changement.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setSaved("Enregistrement…");
    const timer = setTimeout(() => {
      start(async () => {
        const res = await saveWorkspace(moduleId, courseId, {
          title,
          prepStatus: status,
          deliverable,
          resourceOrder: resources.map((r) => r.id),
        });
        setError(res.error);
        setSaved(
          res.error
            ? ""
            : `Enregistré à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
        );
      });
    }, 700);
    return () => clearTimeout(timer);
  }, [title, status, deliverable, resources, moduleId, courseId]);

  function move(index: number, dir: "up" | "down") {
    const next = dir === "up" ? moveUp(resources, index) : moveDown(resources, index);
    setResources(next);
    const pos = (dir === "up" ? index - 1 : index + 1) + 1;
    setAnnounce(
      `« ${resources[index].title} » est maintenant en position ${pos} sur ${resources.length}.`,
    );
    requestAnimationFrame(() =>
      document.getElementById(`mv-${resources[index].id}-${dir}`)?.focus(),
    );
  }

  function remove(r: WorkspaceResource) {
    start(async () => {
      const res = await removeCourseResource(moduleId, courseId, r.id);
      if (res.error) setError(res.error);
      else {
        setResources((list) => list.filter((x) => x.id !== r.id));
        setAnnounce(`« ${r.title} » est retirée du déroulé.`);
      }
    });
  }

  return (
    <div className="space-y-3">
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>

      <div className="bg-card flex flex-wrap items-end justify-between gap-3 rounded-3xl border p-4 shadow-sm">
        <div className="min-w-72 flex-1">
          <label htmlFor="session-title" className="text-muted-foreground mb-1 block text-[0.8rem]">
            Titre de la séance
          </label>
          <input
            id="session-title"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            className="border-input bg-background min-h-11 w-full rounded-xl border px-3 font-semibold"
          />
        </div>
        <div>
          <span id="status-label" className="text-muted-foreground mb-1 block text-[0.8rem]">
            Statut de préparation
          </span>
          <div role="radiogroup" aria-labelledby="status-label" className="flex gap-1.5">
            {PREP_STATUSES.map((s) => (
              <label
                key={s}
                className={cn(
                  "has-[:focus-visible]:ring-ring flex min-h-11 cursor-pointer items-center rounded-xl border-[1.5px] px-3.5 text-sm font-semibold has-[:focus-visible]:ring-2",
                  status === s
                    ? "bg-primary text-primary-foreground border-transparent"
                    : "bg-card hover:bg-accent",
                )}
              >
                <input
                  type="radio"
                  name="prep-status"
                  value={s}
                  checked={status === s}
                  onChange={() => setStatus(s)}
                  className="sr-only"
                />
                {PREP_STATUS_LABELS[s]}
              </label>
            ))}
          </div>
        </div>
      </div>

      <section aria-labelledby="deroule" className="bg-card rounded-3xl border p-5 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 id="deroule" className="font-heading text-xl font-bold">
            Le déroulé de la séance
          </h2>
          <span className="text-muted-foreground text-[0.8rem]">
            Glisse pour changer l’ordre : c’est l’ordre du cours
          </span>
        </div>
        {resources.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
            Aucune ressource dans le déroulé. Ajoute une ressource retenue ou crée-en une.
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {resources.map((r, i) => (
              <li
                key={r.id}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null && dragIndex !== i) {
                    setResources((list) => reorder(list, dragIndex, i));
                    setAnnounce(
                      `« ${resources[dragIndex].title} » est maintenant en position ${i + 1} sur ${resources.length}.`,
                    );
                  }
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={cn(
                  "bg-muted/40 flex min-h-16 flex-wrap items-center gap-3 rounded-xl border px-3 py-2",
                  dragIndex === i && "opacity-50",
                )}
              >
                <GripVertical
                  aria-hidden
                  className="text-muted-foreground size-5 shrink-0 cursor-grab"
                />
                <strong className="w-5">{i + 1}</strong>
                <div className="min-w-0 flex-1">
                  <strong className="block truncate">{r.title}</strong>
                  <span className="text-muted-foreground text-[0.8rem]">{r.subtitle}</span>
                </div>
                <Pill>{r.kindLabel}</Pill>
                <Pill tone={r.ready ? "ok" : "warn"}>{r.ready ? "Prêt" : "À construire"}</Pill>
                <button
                  id={`mv-${r.id}-up`}
                  type="button"
                  disabled={i === 0}
                  onClick={() => move(i, "up")}
                  aria-label={`Monter « ${r.title} »`}
                  className="hover:bg-accent rounded-lg border p-2 disabled:opacity-40"
                >
                  <ArrowUp aria-hidden className="size-4" />
                </button>
                <button
                  id={`mv-${r.id}-down`}
                  type="button"
                  disabled={i === resources.length - 1}
                  onClick={() => move(i, "down")}
                  aria-label={`Descendre « ${r.title} »`}
                  className="hover:bg-accent rounded-lg border p-2 disabled:opacity-40"
                >
                  <ArrowDown aria-hidden className="size-4" />
                </button>
                <Link href={`/resources/${r.id}`} className={BTN}>
                  Ouvrir<span className="sr-only"> : {r.title}</span>
                </Link>
                <button type="button" className={BTN} onClick={() => remove(r)}>
                  Retirer<span className="sr-only"> : {r.title}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-3 flex flex-wrap gap-2.5">
          <Link
            href={`/modules/${moduleId}/courses/${courseId}/edit`}
            className={cn(BTN, "min-h-12")}
          >
            Ajouter une ressource retenue
          </Link>
          <Link href="/resources/new" className={cn(BTN, "min-h-12 bg-transparent")}>
            Créer une ressource
          </Link>
        </div>
      </section>

      {planAvailable ? (
        <section aria-labelledby="livrable" className="bg-card rounded-3xl border p-5 shadow-sm">
          <h2 id="livrable" className="font-heading mb-1 text-lg font-bold">
            Livrable de la séance
          </h2>
          <label htmlFor="deliverable" className="text-muted-foreground mb-1 block text-sm">
            Ce que les étudiant·es rendent ou gardent à la fin (facultatif).
          </label>
          <Textarea
            id="deliverable"
            rows={3}
            maxLength={DELIVERABLE_MAX}
            value={deliverable}
            onChange={(e) => setDeliverable(e.target.value)}
          />
        </section>
      ) : null}

      <div className="bg-background/95 sticky bottom-0 flex min-h-12 items-center border-t py-2 backdrop-blur">
        <span role="status" aria-live="polite" className="text-sm">
          {saved ? (
            <Pill tone={saved.startsWith("Enregistr") && !saved.endsWith("…") ? "ok" : "plain"}>
              {saved}
            </Pill>
          ) : null}
        </span>
      </div>
      {error ? <ActionError error={error} /> : null}
    </div>
  );
}
