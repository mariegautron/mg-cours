"use client";

import { useState } from "react";

import { ActionError } from "@/components/action-error";
import { PendingButton } from "@/components/ui/pending-button";
import { filenameFromDisposition } from "@/lib/download";

/** « Exporter mes données » : prépare le .zip, puis dit ce qui a été téléchargé. */
export function ExportButton() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="space-y-2">
      <PendingButton
        type="button"
        variant="outline"
        size="touch"
        pending={pending}
        pendingLabel="Préparation de l’export…"
        onClick={async () => {
          setPending(true);
          setMessage("");
          setError("");
          try {
            const res = await fetch("/api/export");
            if (!res.ok) throw new Error(String(res.status));
            let size: number;
            if (res.headers.get("Content-Type")?.includes("application/json")) {
              // Archive lourde : déposée dans le stockage, on suit l'URL signée.
              const { url, bytes } = (await res.json()) as { url: string; bytes: number };
              window.location.assign(url);
              size = bytes;
            } else {
              const blob = await res.blob();
              const name = filenameFromDisposition(
                res.headers.get("Content-Disposition"),
                "mg-cours-mes-donnees.zip",
              );
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = name;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 10_000);
              size = blob.size;
            }
            const mo = size / (1024 * 1024);
            setMessage(
              `Export téléchargé (${mo < 1 ? "moins de 1" : mo.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo).`,
            );
          } catch {
            setError("L’export n’a pas abouti. Réessaie dans un instant.");
          } finally {
            setPending(false);
          }
        }}
      >
        Exporter mes données
      </PendingButton>
      <p role="status" className="text-sm">
        {message}
      </p>
      {error ? <ActionError error={error} /> : null}
    </div>
  );
}
