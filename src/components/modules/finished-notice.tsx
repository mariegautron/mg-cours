"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { undoFinishModule } from "@/app/(app)/modules/actions";
import { Button } from "@/components/ui/button";

/** Après « Terminer le module » : « {module} est terminé · il est dans Terminés · Annuler », 8 s. */
export function FinishedNotice({
  id,
  name,
  token,
  archivedInstead,
}: {
  id: string;
  name: string;
  token: string;
  archivedInstead: boolean;
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(t);
  }, []);
  if (!visible && !message) return null;
  return (
    <div
      role="status"
      className="border-status-ready bg-muted flex flex-wrap items-center gap-3 rounded-xl border p-3"
    >
      <p className="text-sm">
        {message || (
          <>
            <strong>{name}</strong> est terminé · il est dans « Terminés ».
          </>
        )}
      </p>
      {!message ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await undoFinishModule(id, token, archivedInstead);
              setMessage(
                r.ok
                  ? `« ${name} » est de retour dans les modules en cours.`
                  : (r.error ?? "On n’a pas pu annuler."),
              );
              router.replace("/modules");
              router.refresh();
            })
          }
        >
          Annuler
        </Button>
      ) : null}
    </div>
  );
}
