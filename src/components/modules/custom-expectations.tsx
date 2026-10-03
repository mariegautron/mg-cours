"use client";

import { useActionState, useState, useTransition } from "react";

import {
  addCustomExpectation,
  deleteCustomExpectation,
  updateCustomExpectation,
  type CustomExpectationState,
} from "@/app/(app)/modules/[id]/expectations/actions";
import { ActionError } from "@/components/action-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";
import { CUSTOM_ORIGIN_LABEL } from "@/lib/modules/custom-expectations";

function EditRow({ moduleId, item }: { moduleId: string; item: { id: string; label: string } }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: CustomExpectationState, fd: FormData) => {
      const res = await updateCustomExpectation(moduleId, item.id, prev, fd);
      if (res.saved) setEditing(false);
      return res;
    },
    {},
  );
  const [delState, setDelState] = useState<CustomExpectationState>({});
  const [delPending, startDelete] = useTransition();

  return (
    <li className="space-y-2 rounded-lg border p-3">
      {editing ? (
        <form action={action} className="space-y-2">
          <Label htmlFor={`edit-${item.id}`}>Modifier l’attendu</Label>
          <Input
            id={`edit-${item.id}`}
            name="label"
            defaultValue={item.label}
            maxLength={1000}
            required
          />
          <div className="flex gap-2">
            <PendingButton type="submit" size="sm" pending={pending} pendingLabel="Enregistrement…">
              Enregistrer
            </PendingButton>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Annuler
            </Button>
          </div>
          {state.error ? <ActionError error={state.error} /> : null}
        </form>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="min-w-0 flex-1 text-sm">
            {item.label} <Badge variant="outline">{CUSTOM_ORIGIN_LABEL}</Badge>
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              aria-label={`Modifier l’attendu « ${item.label} »`}
              onClick={() => setEditing(true)}
            >
              Modifier
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={delPending}
              aria-label={`Supprimer l’attendu « ${item.label} »`}
              onClick={() =>
                startDelete(async () =>
                  setDelState(await deleteCustomExpectation(moduleId, item.id)),
                )
              }
            >
              Supprimer
            </Button>
          </div>
        </div>
      )}
      {delState.error ? <ActionError error={delState.error} /> : null}
    </li>
  );
}

/** Attendus propres au module, ajoutés à la main (US-125), à côté de ceux de la fiche de l'école. */
export function CustomExpectations({
  moduleId,
  items,
  available,
}: {
  moduleId: string;
  items: { id: string; label: string }[];
  available: boolean;
}) {
  const [state, action, pending] = useActionState(addCustomExpectation.bind(null, moduleId), {});
  return (
    <section aria-labelledby="custom-expectations" className="space-y-3 rounded-lg border p-4">
      <div>
        <h2 id="custom-expectations" className="text-lg font-medium">
          Mes attendus pour ce module
        </h2>
        <p className="text-muted-foreground text-sm">
          Ce que tu veux ajouter à la fiche de l’école. Ils comptent dans la progression et le
          rapprochement des ressources, comme les autres.
        </p>
      </div>
      {!available ? (
        <p className="text-sm">
          L’ajout d’attendus sera disponible après la mise à jour de la base de données.
        </p>
      ) : (
        <>
          {items.length ? (
            <ul className="space-y-2">
              {items.map((i) => (
                <EditRow key={i.id} moduleId={moduleId} item={i} />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">Aucun attendu ajouté pour l’instant.</p>
          )}
          <form key={items.length} action={action} className="space-y-2">
            <Label htmlFor="custom-label">Ajouter un attendu</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="custom-label"
                name="label"
                maxLength={1000}
                required
                placeholder="Ex. Savoir animer un atelier de co-conception"
                className="min-w-64 flex-1"
              />
              <PendingButton type="submit" pending={pending} pendingLabel="Ajout…">
                Ajouter
              </PendingButton>
            </div>
            {state.error ? <ActionError error={state.error} /> : null}
          </form>
        </>
      )}
    </section>
  );
}
