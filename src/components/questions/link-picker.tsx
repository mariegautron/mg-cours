"use client";

import { useActionState, useState } from "react";

import { ActionError } from "@/components/action-error";
import type { LinkState } from "@/app/(app)/questions/link-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingButton } from "@/components/ui/pending-button";

export interface PickerItem {
  id: string;
  label: string;
  hint?: string;
}

/** Choisir parmi une liste (questions ou ressources) ce qui est lié : filtre, cases à cocher, enregistrement. */
export function LinkPicker({
  action,
  items,
  selected,
  legend,
  filterLabel,
  idPrefix = "link",
}: {
  action: (state: LinkState, formData: FormData) => Promise<LinkState>;
  items: PickerItem[];
  selected: string[];
  legend: string;
  filterLabel: string;
  /** Préfixe des identifiants quand plusieurs sélecteurs sont sur la même page. */
  idPrefix?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const [picked, setPicked] = useState(() => new Set(selected));
  const shown = items.filter(
    (i) => picked.has(i.id) || !q || `${i.label} ${i.hint ?? ""}`.toLowerCase().includes(q),
  );

  return (
    <form action={formAction} className="space-y-3">
      {[...picked].map((id) => (
        <input key={id} type="hidden" name="ids" value={id} />
      ))}
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-filter`}>{filterLabel}</Label>
        <Input
          id={`${idPrefix}-filter`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">{legend}</legend>
        <ul className="max-h-72 space-y-1 overflow-auto rounded-md border p-2">
          {shown.map((i) => (
            <li key={i.id}>
              <label className="flex min-h-9 items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={picked.has(i.id)}
                  onChange={(e) =>
                    setPicked((cur) => {
                      const next = new Set(cur);
                      if (e.target.checked) next.add(i.id);
                      else next.delete(i.id);
                      return next;
                    })
                  }
                  className="mt-1"
                />
                <span>
                  {i.label}
                  {i.hint ? (
                    <span className="text-muted-foreground block text-xs">{i.hint}</span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
          {shown.length === 0 ? (
            <li className="text-muted-foreground text-sm">Rien ne correspond.</li>
          ) : null}
        </ul>
      </fieldset>
      <div className="flex items-center gap-3">
        <PendingButton type="submit" size="sm" pending={pending} pendingLabel="Enregistrement…">
          Enregistrer les liens
        </PendingButton>
        {state.saved ? (
          <p role="status" className="text-sm">
            Liens enregistrés.
          </p>
        ) : null}
      </div>
      {state.error ? <ActionError error={state.error} /> : null}
    </form>
  );
}
