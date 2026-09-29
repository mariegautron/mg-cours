import Link from "next/link";

import { unretainResource } from "@/app/(app)/modules/[id]/retained/actions";
import { AudienceBadge, KindBadge, StatusBadge } from "@/components/resources/resource-badges";
import { Button } from "@/components/ui/button";
import type { LinkedResource } from "@/lib/modules/queries";

/** Ressources retenues pour le module (US-55) : proposées en tête quand on lie une séance. */
export function RetainedResources({
  moduleId,
  resources,
}: {
  moduleId: string;
  resources: LinkedResource[];
}) {
  return (
    <section aria-labelledby="retained" className="space-y-2">
      <h2 id="retained" className="scroll-mt-16 text-lg font-medium">
        Ressources retenues ({resources.length})
      </h2>
      {resources.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aucune ressource retenue. Depuis{" "}
          <Link href="/resources" className="underline underline-offset-2">
            Ressources
          </Link>
          , « Ajouter au module… » les met de côté ici ; elles seront proposées en premier quand
          vous lierez une séance.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {resources.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/resources/${r.id}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {r.title}
                </Link>
                <KindBadge kind={r.kind} />
                <AudienceBadge audience={r.audience} />
                <StatusBadge status={r.status} />
              </div>
              <form action={unretainResource.bind(null, moduleId, r.id)}>
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  aria-label={`Ne plus retenir ${r.title}`}
                >
                  Retirer
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
