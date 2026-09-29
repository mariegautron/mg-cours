import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { ModuleExpectation } from "@/lib/modules/queries";

/** Attendus de l'école sur la fiche module (US-53) : résumé et accès à la lecture / correction. */
export function ExpectationsSummary({
  moduleId,
  expectations,
}: {
  moduleId: string;
  expectations: ModuleExpectation[];
}) {
  const objectives = expectations.filter((e) => e.kind === "objective");
  const units = expectations.filter((e) => e.kind === "unit");
  return (
    <section aria-labelledby="expectations" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="expectations" className="scroll-mt-16 text-lg font-medium">
          Attendus de l’école
        </h2>
        <div className="flex flex-wrap gap-2">
          {expectations.length ? (
            <Button asChild size="sm">
              <Link href={`/modules/${moduleId}/matching`}>Rapprocher avec les ressources</Link>
            </Button>
          ) : null}
          <Button asChild size="sm" variant="secondary">
            <Link href={`/modules/${moduleId}/expectations`}>
              {expectations.length
                ? "Lire ou modifier les attendus"
                : "Lire les attendus de la fiche"}
            </Link>
          </Button>
        </div>
      </div>
      {expectations.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aucun attendu enregistré. Lisez la fiche YNOV pour retrouver les objectifs à couvrir.
        </p>
      ) : (
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">
            {objectives.length} objectif{objectives.length > 1 ? "s" : ""} pédagogique
            {objectives.length > 1 ? "s" : ""} · {units.length} unité{units.length > 1 ? "s" : ""}
          </p>
          <ul className="list-disc space-y-0.5 pl-5">
            {objectives.slice(0, 3).map((o) => (
              <li key={o.id}>{o.label}</li>
            ))}
          </ul>
          {objectives.length > 3 ? (
            <p className="text-muted-foreground">… et {objectives.length - 3} autre(s).</p>
          ) : null}
        </div>
      )}
    </section>
  );
}
