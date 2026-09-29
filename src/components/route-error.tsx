"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { Mascot } from "@/components/mascot";
import { Button } from "@/components/ui/button";

/**
 * Écran d'erreur de route (`error.tsx`) : ton de soutien, une issue claire. Le message technique
 * n'est jamais affiché (il reste dans la console et, via `digest`, dans les journaux serveur).
 */
export function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
      <Mascot mood="thinking" className="size-24" />
      <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold outline-none">
        On n’a pas pu charger cette page
      </h1>
      <p className="text-muted-foreground">
        Tes données ne sont pas perdues. Réessaie dans un instant ; si ça continue, reviens au
        tableau de bord.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={() => retry()}>
          Réessayer
        </Button>
        <Button asChild variant="secondary">
          <Link href="/dashboard">Retour au tableau de bord</Link>
        </Button>
      </div>
    </div>
  );
}
