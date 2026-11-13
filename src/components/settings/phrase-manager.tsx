"use client";

import { useActionState, useState } from "react";

import { addPhrase, deletePhrase, updatePhrase } from "@/app/(app)/settings/phrase-actions";
import { ActionError } from "@/components/action-error";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PARTS, PART_LABELS, type Part } from "@/lib/appreciations/draft";

type Phrases = Record<Part, { id: string; text: string }[]>;

function PhraseRow({ id, text }: { id: string; text: string }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: { error?: string; ok?: boolean }, fd: FormData) => {
      const r = await updatePhrase(id, prev, fd);
      if (r.ok) setEditing(false);
      return r;
    },
    {},
  );
  return (
    <li className="py-2">
      {editing ? (
        <form action={action} className="space-y-2">
          <Label htmlFor={`phrase-${id}`}>Ta formulation</Label>
          <Textarea id={`phrase-${id}`} name="text" defaultValue={text} rows={3} maxLength={300} />
          {state.error ? <ActionError error={state.error} /> : null}
          <div className="flex gap-2">
            <Button type="submit" size="touch" disabled={pending}>
              Enregistrer
            </Button>
            <Button type="button" variant="ghost" size="touch" onClick={() => setEditing(false)}>
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm">{text}</p>
          <div className="flex shrink-0 gap-1">
            <Button type="button" variant="outline" size="touch" onClick={() => setEditing(true)}>
              Modifier
              <span className="sr-only"> cette formulation</span>
            </Button>
            <ConfirmDeleteButton
              iconOnly
              touch
              itemName="cette formulation"
              title="Supprimer cette formulation ?"
              description="Le gabarit reviendra aux formulations de l’appli pour cette partie."
              onConfirm={deletePhrase.bind(null, id)}
            />
          </div>
        </div>
      )}
    </li>
  );
}

function AddPhrase({ part }: { part: Part }) {
  const [state, action, pending] = useActionState(addPhrase, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="part" value={part} />
      <Label htmlFor={`new-${part}`}>
        Ajouter une formulation : {PART_LABELS[part].toLowerCase()}
      </Label>
      <Textarea
        id={`new-${part}`}
        name="text"
        rows={2}
        maxLength={300}
        key={state.ok ? "sent" : "new"}
      />
      {state.error ? <ActionError error={state.error} /> : null}
      <Button type="submit" variant="secondary" size="touch" disabled={pending}>
        Ajouter
      </Button>
    </form>
  );
}

/** Formulations personnelles par partie du gabarit : elles passent avant celles de l'appli. */
export function PhraseManager({ phrases }: { phrases: Phrases }) {
  return (
    <div className="space-y-5">
      {PARTS.map((part) => (
        <section key={part} aria-labelledby={`phrases-${part}`} className="space-y-2">
          <h3 id={`phrases-${part}`} className="text-sm font-semibold">
            {PART_LABELS[part]}
          </h3>
          {phrases[part].length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucune formulation à toi : le gabarit utilise celles de l’appli.
            </p>
          ) : (
            <ul className="divide-y">
              {phrases[part].map((p) => (
                <PhraseRow key={p.id} id={p.id} text={p.text} />
              ))}
            </ul>
          )}
          <AddPhrase part={part} />
        </section>
      ))}
      <p className="text-muted-foreground text-xs">
        Tu peux garder un trou à compléter avec « [à compléter : un exemple précis] » : la copie
        reste bloquée tant qu’il en reste un.
      </p>
    </div>
  );
}
