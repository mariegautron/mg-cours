"use client";

import { useActionState } from "react";
import Link from "next/link";

import type { GridFormState } from "@/app/(app)/assessments/grids/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GridWithCriteria } from "@/lib/assessments/queries";

type Action = (state: GridFormState, formData: FormData) => Promise<GridFormState>;

export function GridForm({ action, grid }: { action: Action; grid?: GridWithCriteria }) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};
  const criteriaText = grid?.criteria.map((c) => `${c.label} | ${c.weight}`).join("\n") ?? "";
  const maxScore = grid?.criteria.reduce((sum, c) => sum + c.weight, 0) ?? 0;

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nom de la grille</Label>
        <Input id="name" name="name" required defaultValue={grid?.name ?? ""} />
        {fe.name?.length ? (
          <p role="alert" className="text-destructive text-sm">
            {fe.name.join(" ")}
          </p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={grid?.description ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="criteriaText">Critères</Label>
        <Textarea
          id="criteriaText"
          name="criteriaText"
          rows={8}
          className="font-mono text-sm"
          placeholder={"Présentation | 4\nDémonstration | 6\nQualité du code | 10"}
          defaultValue={criteriaText}
        />
        <p className="text-muted-foreground text-sm">
          Un critère par ligne, format « Libellé | points ». Barème actuel : {maxScore} points.
        </p>
        {fe.criteriaText?.length ? (
          <p role="alert" className="text-destructive text-sm">
            {fe.criteriaText.join(" ")}
          </p>
        ) : null}
      </div>
      {state.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href="/assessments/grids">Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
