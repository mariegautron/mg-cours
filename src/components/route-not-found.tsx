import Link from "next/link";

import { Mascot } from "@/components/mascot";
import { Button } from "@/components/ui/button";

/** Écran « page introuvable » (`not-found.tsx`) : dit ce qui se passe et où aller. */
export function RouteNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-12 text-center">
      <Mascot mood="thinking" className="size-24" />
      <h1 className="text-2xl font-semibold">Cette page n’existe pas</h1>
      <p className="text-muted-foreground">
        Le lien est peut-être ancien. Reviens à ton tableau de bord.
      </p>
      <Button asChild>
        <Link href="/dashboard">Aller à Aujourd’hui</Link>
      </Button>
    </div>
  );
}
