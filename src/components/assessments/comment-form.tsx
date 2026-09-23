"use client";

import { useActionState } from "react";
import Link from "next/link";

import type { CommentFormState } from "@/app/(app)/assessments/comments/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/types/db";

type Action = (state: CommentFormState, formData: FormData) => Promise<CommentFormState>;

const CATEGORY_LABELS: Record<Tables<"predefined_comment">["category"], string> = {
  positive: "Positif",
  negative: "Négatif",
  advice: "Conseil",
};

export function CommentForm({
  action,
  comment,
}: {
  action: Action;
  comment?: Tables<"predefined_comment">;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="text">Texte</Label>
        <Textarea id="text" name="text" rows={3} required defaultValue={comment?.text ?? ""} />
        {fe.text?.length ? (
          <p role="alert" className="text-destructive text-sm">
            {fe.text.join(" ")}
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Catégorie</Label>
          <select
            id="category"
            name="category"
            defaultValue={comment?.category ?? "advice"}
            className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            name="tags"
            placeholder="oral, agile"
            defaultValue={(comment?.tags ?? []).join(", ")}
          />
        </div>
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
          <Link href="/assessments/comments">Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
