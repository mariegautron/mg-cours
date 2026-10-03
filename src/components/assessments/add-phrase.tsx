"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { savePhrase } from "@/app/(app)/assessments/comments/actions";
import { ActionError } from "@/components/action-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Ajouter une phrase à un critère (ou sans critère), depuis la page « Phrases de correction ». */
export function AddPhrase({ criterionId, label }: { criterionId: string | null; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="touch" onClick={() => setOpen(true)}>
        Ajouter une phrase à ce critère
        <span className="sr-only"> : {label}</span>
      </Button>
    );
  }
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const result = await savePhrase({
            text,
            criterionId,
            subject: "",
            category: "advice",
          });
          if (result.error) {
            setError(result.error);
            return;
          }
          setError(null);
          setText("");
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <div className="min-w-64 flex-1 space-y-1">
        <Label htmlFor={`phrase-${criterionId ?? "general"}`}>Nouvelle phrase : {label}</Label>
        <Input
          id={`phrase-${criterionId ?? "general"}`}
          value={text}
          maxLength={1000}
          autoComplete="off"
          autoFocus
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <Button type="submit" size="touch" disabled={pending || !text.trim()}>
        {pending ? "Enregistrement…" : "Ajouter"}
      </Button>
      <Button type="button" variant="ghost" size="touch" onClick={() => setOpen(false)}>
        Annuler
      </Button>
      {error ? <ActionError error={error} /> : null}
    </form>
  );
}
