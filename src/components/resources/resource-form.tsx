"use client";

import { useActionState } from "react";
import Link from "next/link";

import type { ResourceFormState } from "@/app/(app)/resources/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/types/db";

type Action = (state: ResourceFormState, formData: FormData) => Promise<ResourceFormState>;

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
      {errors.join(" ")}
    </p>
  );
}

export function ResourceForm({
  action,
  resource,
}: {
  action: Action;
  resource?: Tables<"resource">;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Titre</Label>
        <Input
          id="title"
          name="title"
          required
          defaultValue={resource?.title ?? ""}
          aria-describedby={fe.title ? "title-error" : undefined}
        />
        <FieldError id="title" errors={fe.title} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={resource?.description ?? ""}
        />
        <FieldError id="description" errors={fe.description} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Catégorie</Label>
          <Input id="category" name="category" defaultValue={resource?.category ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="url">Lien</Label>
          <Input
            id="url"
            name="url"
            type="url"
            placeholder="https://…"
            defaultValue={resource?.url ?? ""}
            aria-describedby={fe.url ? "url-error" : undefined}
          />
          <FieldError id="url" errors={fe.url} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          name="tags"
          placeholder="agile, scrum, master"
          defaultValue={(resource?.tags ?? []).join(", ")}
        />
        <p className="text-muted-foreground text-sm">Séparés par des virgules.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Contenu (Markdown)</Label>
        <Textarea
          id="content"
          name="content"
          rows={12}
          className="font-mono text-sm"
          defaultValue={resource?.content ?? ""}
        />
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
          <Link href={resource ? `/resources/${resource.id}` : "/resources"}>Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
