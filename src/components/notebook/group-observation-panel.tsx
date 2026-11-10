"use client";

import { useActionState, useState, useTransition } from "react";

import { deleteGroupObservationById } from "@/app/(app)/modules/[id]/courses/[courseId]/notebook/actions";

import { ActionError } from "@/components/action-error";
import { ObservationItem } from "@/components/notebook/observation-item";
import type { NotebookState } from "@/app/(app)/modules/[id]/courses/[courseId]/notebook/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CHOOSABLE_OBSERVATION_TAGS } from "@/lib/notebook/notebook";
import type { GroupObservationRow } from "@/lib/notebook/queries";

type Action = (state: NotebookState, formData: FormData) => Promise<NotebookState>;

/**
 * Une ligne par groupe au-dessus de la liste des personnes : l'observation s'enregistre une fois
 * sur le groupe et apparaît dans la base de chaque membre. Vue privée, jamais projetée.
 */
export function GroupObservationPanel({
  action,
  groups,
  recent,
}: {
  action: Action;
  groups: { id: string; name: string; count: number }[];
  recent: GroupObservationRow[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [openId, setOpenId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<number | undefined>();
  const [undone, setUndone] = useState<string | null>(null);
  const [undoing, startUndo] = useTransition();
  if (state.savedAt && state.savedAt !== lastSaved) {
    setLastSaved(state.savedAt);
    setOpenId(null);
  }
  if (groups.length === 0) return null;
  const nameOf = new Map(groups.map((g) => [g.id, g.name]));

  return (
    <section aria-labelledby="group-obs" className="space-y-2">
      <h3 id="group-obs" className="text-sm font-semibold">
        Groupes
      </h3>
      <ul className="divide-y rounded-lg border">
        {groups.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              aria-expanded={openId === g.id}
              aria-controls={`group-obs-${g.id}`}
              onClick={() => setOpenId(openId === g.id ? null : g.id)}
              className="hover:bg-muted focus-visible:ring-ring flex min-h-12 w-full items-center gap-2 px-3 text-left focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="font-medium">Groupe {g.name}</span>
              <span className="text-muted-foreground text-xs">
                {g.count} observation{g.count > 1 ? "s" : ""}
              </span>
              <span className="sr-only"> : ajouter une observation sur le groupe</span>
            </button>
            {openId === g.id ? (
              <form
                id={`group-obs-${g.id}`}
                action={formAction}
                className="bg-muted/40 space-y-3 p-3"
              >
                <input type="hidden" name="groupId" value={g.id} />
                <div className="space-y-1">
                  <Label htmlFor={`group-obs-${g.id}-note`}>Observation sur le groupe</Label>
                  <Textarea
                    id={`group-obs-${g.id}-note`}
                    name="note"
                    rows={4}
                    maxLength={1000}
                    autoFocus
                  />
                </div>
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">
                    Étiquette pour le groupe {g.name}
                  </legend>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {CHOOSABLE_OBSERVATION_TAGS.map((t) => (
                      <Button
                        key={t.value}
                        type="submit"
                        name="tag"
                        value={t.value}
                        variant="secondary"
                        size="touch"
                        disabled={pending}
                        className="justify-start"
                      >
                        {t.label}
                      </Button>
                    ))}
                  </div>
                </fieldset>
                <Button type="button" variant="ghost" size="touch" onClick={() => setOpenId(null)}>
                  Fermer
                </Button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
      <p role="status" className="text-muted-foreground min-h-5 text-sm">
        {undone && undone === state.observationId ? "Observation annulée." : (state.message ?? "")}
        {state.observationId && undone !== state.observationId ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            disabled={undoing}
            onClick={() =>
              startUndo(async () => {
                await deleteGroupObservationById(state.observationId!);
                setUndone(state.observationId!);
              })
            }
          >
            Annuler
          </Button>
        ) : null}
      </p>
      {state.error ? <ActionError error={state.error} /> : null}
      {recent.length > 0 ? (
        <details className="rounded-lg border">
          <summary className="min-h-11 cursor-pointer px-3 py-2 text-sm font-medium">
            Notées sur les groupes pendant cette séance ({recent.length})
          </summary>
          <ul className="divide-y text-sm">
            {recent.map((o) => (
              <li key={o.id} className="p-3">
                <ObservationItem
                  id={o.id}
                  scope="group"
                  studentId={o.student_group_id}
                  tag={o.tag}
                  note={o.note}
                  heading={
                    <span className="font-medium">
                      Groupe {nameOf.get(o.student_group_id) ?? "—"}
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
