import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/**
 * Tous les paliers d'un critère, du plus haut au plus bas, en cartes : celui obtenu ressort
 * (bordure, fond et mention écrite, jamais la couleur seule).
 */
export function CriterionLevels({
  levels,
}: {
  levels: { points: number; description: string; obtained: boolean }[];
}) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2" aria-label="Paliers du critère">
      {levels.map((l) => (
        <li
          key={l.points}
          aria-current={l.obtained ? "true" : undefined}
          className={cn(
            "space-y-1 rounded-xl border p-3 text-sm",
            l.obtained
              ? "border-primary bg-primary/10 ring-primary/40 ring-2"
              : "text-muted-foreground bg-muted/30",
          )}
        >
          <p className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold">{fmt(l.points)} pt</span>
            {l.obtained ? (
              <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">
                ✓ Palier obtenu
              </span>
            ) : null}
          </p>
          <p className={l.obtained ? "text-foreground" : undefined}>{l.description}</p>
        </li>
      ))}
    </ol>
  );
}
