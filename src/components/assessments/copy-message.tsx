"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

/** Message prêt à copier (rien n'est envoyé par l'appli). */
export function CopyMessage({ text, label }: { text: string; label: string }) {
  const [status, setStatus] = useState("");
  return (
    <div className="space-y-1">
      <Button
        type="button"
        size="touch"
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setStatus("Message copié.");
          } catch {
            setStatus("Copie impossible depuis ce navigateur : sélectionne le message à la main.");
          }
        }}
      >
        {label}
      </Button>
      <p role="status" className="text-muted-foreground min-h-5 text-xs">
        {status}
      </p>
    </div>
  );
}
