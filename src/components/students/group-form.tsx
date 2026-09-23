"use client";

import { useActionState } from "react";
import Link from "next/link";

import type { GroupFormState } from "@/app/(app)/modules/[id]/groups/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Action = (state: GroupFormState, formData: FormData) => Promise<GroupFormState>;

const GROUP_TYPE_LABELS: Record<string, string> = {
  tp: "TP",
  td: "TD",
  project: "Projet",
};

export function GroupForm({ action, moduleId }: { action: Action; moduleId: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="max-w-md space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nom du groupe</Label>
        <Input
          id="name"
          name="name"
          required
          aria-describedby={fe.name ? "name-error" : undefined}
        />
        {fe.name?.length ? (
          <p id="name-error" role="alert" className="text-destructive text-sm">
            {fe.name.join(" ")}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <select
          id="type"
          name="type"
          defaultValue="project"
          className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
        >
          {Object.entries(GROUP_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Créer le groupe"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href={`/modules/${moduleId}`}>Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
