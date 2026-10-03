"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

/** « Copier le message » : copie le texte, annonce le résultat (aria-live). */
export function CopyMessageButton({ text, label }: { text: string; label: string }) {
  const [note, setNote] = useState("");
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        aria-label={`Copier le message : ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setNote("Message copié.");
          } catch {
            setNote("Copie impossible : sélectionne le message à la main.");
          }
        }}
      >
        Copier le message
      </Button>
      <span role="status" aria-live="polite" className="text-muted-foreground text-xs">
        {note}
      </span>
    </>
  );
}
