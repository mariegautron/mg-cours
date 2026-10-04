"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";

import {
  addCourseResource,
  removeCourseResource,
  saveWorkspace,
} from "@/app/(app)/modules/[id]/courses/workspace-actions";
import { ActionError } from "@/components/action-error";
import { Pill } from "@/components/dashboard/pill";
import { Textarea } from "@/components/ui/textarea";
import {
  ACTIVITY_PREP_STATES,
  ACTIVITY_TYPES,
  describeActivity,
  checkDuration,
  OBJECTIVES,
  startTimes,
  totalMinutes,
  type Activity,
} from "@/lib/modules/activity";
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
  /** Détails de l'activité dans le déroulé (durée, type, horaire, objectif, état). */
  activity: Activity;
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
  addable: addableInitial,
  planAvailable,
  activitiesAvailable,
  sessionMinutes,
  sessionStart,
}: {
  moduleId: string;
  courseId: string;
  initial: {
    title: string;
    prepStatus: string;
    deliverable: string;
    resources: WorkspaceResource[];
  };
  /** Ressources retenues du module qui ne sont pas encore dans le déroulé de cette séance. */
  addable: WorkspaceResource[];
  planAvailable: boolean;
  /** Colonnes du déroulé structuré présentes en base (migration appliquée). */
  activitiesAvailable: boolean;
  /** Durée de la séance en minutes et heure de début, pour comparer et déduire les horaires. */
  sessionMinutes: number | null;
  sessionStart: string | null;
}) {
  const [title, setTitle] = useState(initial.title);
  const [status, setStatus] = useState(initial.prepStatus);
  const [deliverable, setDeliverable] = useState(initial.deliverable);
  const [resources, setResources] = useState(initial.resources);
  const [addable, setAddable] = useState(addableInitial);
  const [adding, setAdding] = useState<string | null>(null);
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
          activities: activitiesAvailable
            ? Object.fromEntries(resources.map((r) => [r.id, r.activity]))
            : undefined,
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
  }, [title, status, deliverable, resources, moduleId, courseId, activitiesAvailable]);

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

  const duration = checkDuration(totalMinutes(resources.map((r) => r.activity)), sessionMinutes);
  const starts = startTimes(
    sessionStart,
    resources.map((r) => r.activity),
  );

  function patchActivity(id: string, patch: Partial<Activity>) {
    setResources((list) =>
      list.map((r) => (r.id === id ? { ...r, activity: { ...r.activity, ...patch } } : r)),
    );
  }

  function add(r: WorkspaceResource) {
    if (adding) return;
    setAdding(r.id);
    start(async () => {
      const res = await addCourseResource(moduleId, courseId, r.id);
      setAdding(null);
      if (res.error) setError(res.error);
      else {
        setError(undefined);
        setResources((list) => [...list, r]);
        setAddable((list) => list.filter((x) => x.id !== r.id));
        setAnnounce(`« ${r.title} » est ajoutée à la fin du déroulé.`);
      }
    });
  }

  function remove(r: WorkspaceResource) {
    start(async () => {
      const res = await removeCourseResource(moduleId, courseId, r.id);
      if (res.error) setError(res.error);
      else {
        setResources((list) => list.filter((x) => x.id !== r.id));
        setAddable((list) => (list.some((x) => x.id === r.id) ? list : [...list, r]));
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
        {activitiesAvailable && resources.length > 0 ? (
          <p
            role="status"
            className={cn(
              "mb-2 text-sm font-medium",
              duration.status === "over" && "text-warning",
              duration.status === "ok" && "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {duration.message}
          </p>
        ) : null}
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
                  {activitiesAvailable ? (
                    <span className="text-muted-foreground block text-[0.8rem]">
                      {describeActivity(r.activity, starts[i]) ?? "Pas encore de détails"}
                    </span>
                  ) : null}
                </div>
                <Pill>{r.kindLabel}</Pill>
                <Pill tone={r.ready ? "ok" : "warn"}>{r.ready ? "Prêt" : "À construire"}</Pill>
                {activitiesAvailable ? (
                  <Pill
                    tone={
                      r.activity.prepState === "ready"
                        ? "ok"
                        : r.activity.prepState === "in_progress"
                          ? "wip"
                          : "plain"
                    }
                  >
                    {ACTIVITY_PREP_STATES.find((s) => s.value === r.activity.prepState)?.label}
                  </Pill>
                ) : null}
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
                {activitiesAvailable ? (
                  <details className="basis-full">
                    <summary className="text-primary min-h-11 cursor-pointer py-2 text-sm font-semibold underline underline-offset-2">
                      Détails de l’activité<span className="sr-only"> : {r.title}</span>
                    </summary>
                    <div className="grid gap-3 pb-2 sm:grid-cols-2 lg:grid-cols-5">
                      <div className="space-y-1">
                        <label htmlFor={`dur-${r.id}`} className="text-sm font-medium">
                          Durée estimée (min)
                        </label>
                        <input
                          id={`dur-${r.id}`}
                          type="number"
                          min={1}
                          max={600}
                          inputMode="numeric"
                          value={r.activity.durationMinutes ?? ""}
                          onChange={(e) =>
                            patchActivity(r.id, {
                              durationMinutes: e.target.value ? Number(e.target.value) : null,
                            })
                          }
                          className="border-input bg-background min-h-11 w-full rounded-xl border px-3"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor={`typ-${r.id}`} className="text-sm font-medium">
                          Type
                        </label>
                        <select
                          id={`typ-${r.id}`}
                          value={r.activity.type ?? ""}
                          onChange={(e) => patchActivity(r.id, { type: e.target.value || null })}
                          className="border-input bg-background min-h-11 w-full rounded-xl border px-3"
                        >
                          <option value="">Non précisé</option>
                          {ACTIVITY_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label htmlFor={`sta-${r.id}`} className="text-sm font-medium">
                          Début
                        </label>
                        <input
                          id={`sta-${r.id}`}
                          type="time"
                          value={r.activity.startTime ?? ""}
                          onChange={(e) =>
                            patchActivity(r.id, { startTime: e.target.value || null })
                          }
                          className="border-input bg-background min-h-11 w-full rounded-xl border px-3"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor={`obj-${r.id}`} className="text-sm font-medium">
                          Objectif pédagogique
                        </label>
                        <select
                          id={`obj-${r.id}`}
                          value={r.activity.objective ?? ""}
                          onChange={(e) =>
                            patchActivity(r.id, { objective: e.target.value || null })
                          }
                          className="border-input bg-background min-h-11 w-full rounded-xl border px-3"
                        >
                          <option value="">Non précisé</option>
                          {OBJECTIVES.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label htmlFor={`prp-${r.id}`} className="text-sm font-medium">
                          Préparation
                        </label>
                        <select
                          id={`prp-${r.id}`}
                          value={r.activity.prepState}
                          onChange={(e) =>
                            patchActivity(r.id, {
                              prepState: e.target.value as Activity["prepState"],
                            })
                          }
                          className="border-input bg-background min-h-11 w-full rounded-xl border px-3"
                        >
                          {ACTIVITY_PREP_STATES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </details>
                ) : null}
              </li>
            ))}
          </ol>
        )}
        <details className="mt-3">
          <summary
            className={cn(BTN, "min-h-12 cursor-pointer list-none")}
            aria-label="Ajouter une ressource retenue"
          >
            Ajouter une ressource retenue
          </summary>
          <div className="bg-muted/30 mt-2 rounded-xl border p-3">
            {addable.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Toutes les ressources retenues du module sont déjà dans le déroulé.{" "}
                <Link
                  href={`/modules/${moduleId}/matching`}
                  className="underline underline-offset-2"
                >
                  Retenir d’autres ressources (rapprochement)
                </Link>
                .
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {addable.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate">{r.title}</strong>
                      <span className="text-muted-foreground text-[0.8rem]">{r.subtitle}</span>
                    </div>
                    <Pill>{r.kindLabel}</Pill>
                    <button
                      type="button"
                      className={BTN}
                      aria-busy={adding === r.id || undefined}
                      onClick={() => add(r)}
                    >
                      {adding === r.id ? "Ajout…" : "Ajouter"}
                      <span className="sr-only"> au déroulé : {r.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
        <div className="mt-3 flex flex-wrap gap-2.5">
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
