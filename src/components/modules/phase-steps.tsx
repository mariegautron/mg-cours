import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Status } from "@/components/dashboard/pill";
import type { ModuleStep } from "@/lib/ynov/module-steps";

const STATE: Record<ModuleStep["state"], { state: "ready" | "todo" | "idle"; label: string }> = {
  done: { state: "ready", label: "Fait" },
  in_progress: { state: "todo", label: "En cours" },
  waiting: { state: "todo", label: "En attente" },
  todo: { state: "idle", label: "À faire" },
};

/**
 * Liste d'étapes d'une phase (Préparer, Clôturer) : une ligne cliquable par étape, avec son statut
 * et son résumé. Composant facile à remplacer quand le contenu de « Préparer » sera redéfini.
 */
export function PhaseSteps({ steps, label }: { steps: ModuleStep[]; label: string }) {
  return (
    <ul aria-label={label} className="bg-card rounded-xl border px-5 py-2">
      {steps.map((s) => (
        <li key={s.key} className="border-t first:border-t-0">
          <Link
            href={s.action.href}
            className="group hover:bg-muted/50 -mx-2 flex min-h-14 items-center gap-3 rounded-lg px-2 py-2.5"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-medium group-hover:underline">{s.title}</span>
              <span className="text-muted-foreground block text-[0.8125rem]">
                {s.summary}
                {s.state !== "done" ? ` · ${s.action.label}` : ""}
              </span>
            </span>
            <Status state={STATE[s.state].state}>{STATE[s.state].label}</Status>
            <ChevronRight aria-hidden className="text-muted-foreground size-4 shrink-0" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
