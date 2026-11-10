"use client";

import { useActionState, useState } from "react";

import {
  deleteGroupObservationById,
  deleteObservationById,
  updateGroupObservation,
  updateObservation,
  type NotebookState,
} from "@/app/(app)/modules/[id]/courses/[courseId]/notebook/actions";
import { ActionError } from "@/components/action-error";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  OBSERVATION_TAG_LABELS,
  OBSERVATION_TAGS,
  type ObservationTag,
} from "@/lib/notebook/notebook";

/**
 * Une observation privée avec « Modifier » (personne, étiquette, texte) et « Supprimer ».
 * Utilisée dans le carnet de séance et sur la fiche étudiant·e.
 */
export function ObservationItem({
  id,
  studentId,
  tag,
  note,
  heading,
  students,
  scope = "student",
}: {
  id: string;
  /** Identifiant de la personne, ou du groupe quand `scope` vaut « group ». */
  studentId: string;
  tag: ObservationTag;
  note: string | null;
  /** Ligne d'en-tête (date, personne, séance…). */
  heading: React.ReactNode;
  /** Si fourni, la personne peut être changée. */
  students?: { id: string; first_name: string; last_name: string }[];
  scope?: "student" | "group";
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(async (prev: NotebookState, fd: FormData) => {
    const r = await (scope === "group" ? updateGroupObservation : updateObservation)(id, prev, fd);
    if (!r.error) setEditing(false);
    return r;
  }, {});
  const fieldId = `obs-${id}`;

  return (
    <div className="flex items-start justify-between gap-2">
      {editing ? (
        <form action={formAction} className="w-full space-y-2">
          {students ? (
            <div className="space-y-1">
              <Label htmlFor={`${fieldId}-student`}>Personne</Label>
              <select
                id={`${fieldId}-student`}
                name="studentId"
                defaultValue={studentId}
                className="border-input bg-background h-10 w-full rounded-md border px-2"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input
              type="hidden"
              name={scope === "group" ? "groupId" : "studentId"}
              value={studentId}
            />
          )}
          <div className="space-y-1">
            <Label htmlFor={`${fieldId}-tag`}>Étiquette</Label>
            <select
              id={`${fieldId}-tag`}
              name="tag"
              defaultValue={tag}
              className="border-input bg-background h-10 w-full rounded-md border px-2"
            >
              {OBSERVATION_TAGS.filter(
                // Ancienne étiquette « Absent·e ou retard » : gardée seulement si elle est déjà posée.
                (t) => t.value !== "absent_late" || t.value === tag,
              ).map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${fieldId}-note`}>Observation</Label>
            <Textarea
              id={`${fieldId}-note`}
              name="note"
              defaultValue={note ?? ""}
              maxLength={1000}
              rows={4}
            />
          </div>
          {state.error ? <ActionError error={state.error} /> : null}
          <div className="flex gap-2">
            <Button type="submit" size="touch" disabled={pending}>
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button type="button" variant="ghost" size="touch" onClick={() => setEditing(false)}>
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {heading}
              <Badge variant="outline">{OBSERVATION_TAG_LABELS[tag]}</Badge>
            </p>
            {note ? <p className="mt-1 whitespace-pre-wrap">{note}</p> : null}
          </div>
          <div className="flex shrink-0 gap-1">
            <Button type="button" variant="outline" size="touch" onClick={() => setEditing(true)}>
              Modifier
              <span className="sr-only"> l’observation</span>
            </Button>
            <ConfirmDeleteButton
              iconOnly
              touch
              itemName="cette observation"
              title="Supprimer cette observation ?"
              description={
                scope === "group"
                  ? "Elle disparaîtra de la fiche du groupe et de la base de chaque membre."
                  : "Elle disparaîtra aussi du journal de la fiche étudiant·e."
              }
              onConfirm={(scope === "group"
                ? deleteGroupObservationById
                : deleteObservationById
              ).bind(null, id)}
            />
          </div>
        </>
      )}
    </div>
  );
}
