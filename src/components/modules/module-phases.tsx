"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

import { PHASES, phaseFromParam, type ModulePhase } from "@/lib/modules/phases";
import { cn } from "@/lib/utils";

/**
 * Fil de phase d'un module : « Préparer · Enseigner · Clôturer » (lot N4). Style volontairement
 * minimal et isolé ici : la DA est à revoir par Arnaud, en un seul endroit.
 */
export function ModulePhases({
  moduleId,
  current,
  done,
}: {
  moduleId: string;
  /** Phase en cours du module (calculée). */
  current: ModulePhase;
  /** Phases finies (coche). */
  done: Partial<Record<ModulePhase, boolean>>;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  // Sur l'accueil du module, la phase affichée est sélectionnée ; ailleurs, aucune.
  const shown =
    pathname.replace(/\/$/, "") === `/modules/${moduleId}`
      ? (phaseFromParam(params.get("phase")) ?? current)
      : null;
  return (
    <nav aria-label="Phases du module" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1 text-[0.8125rem]">
        {PHASES.map((p, i) => {
          const selected = (shown ?? null) === p.key;
          return (
            <li key={p.key} className="flex items-center gap-1">
              {i > 0 ? (
                <span aria-hidden className="text-muted-foreground-2">
                  ·
                </span>
              ) : null}
              <Link
                href={`/modules/${moduleId}?phase=${p.param}`}
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-1 rounded-lg px-2 font-medium",
                  selected
                    ? "text-foreground bg-muted"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {done[p.key] ? (
                  <Check aria-hidden className="text-status-ready-fg size-3.5" />
                ) : null}
                {p.label}
                {current === p.key ? (
                  <span className="text-primary text-xs">· en cours</span>
                ) : null}
                {done[p.key] ? <span className="sr-only"> (terminée)</span> : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
