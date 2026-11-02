import { cn } from "@/lib/utils";

const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

type Level = { points: number; description: string; obtained: boolean };

/**
 * Les paliers d'un critère d'un coup d'œil : une rangée de pastilles (du plus haut au plus bas) où
 * celui obtenu ressort, puis sa description en clair. La description des autres paliers reste à un
 * clic, pour ne pas noyer la page. Le palier obtenu est aussi écrit (jamais la couleur seule).
 */
export function CriterionLevels({ levels }: { levels: Level[] }) {
  const obtained = levels.find((l) => l.obtained);
  return (
    <div className="space-y-3">
      <ol className="flex flex-wrap items-center gap-2" aria-label="Paliers du critère">
        {levels.map((l) => (
          <li
            key={l.points}
            aria-current={l.obtained ? "true" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              l.obtained
                ? "border-primary bg-primary text-primary-foreground font-semibold"
                : "text-foreground/70 bg-transparent",
            )}
          >
            {l.obtained ? "✓ " : ""}
            {fmt(l.points)} pt
          </li>
        ))}
      </ol>
      {obtained ? (
        <p className="text-base leading-relaxed">
          <span className="font-semibold">Palier obtenu : </span>
          {obtained.description}
        </p>
      ) : null}
      <details className="group/levels">
        <summary className="text-foreground/80 cursor-pointer text-sm underline underline-offset-2">
          <span className="group-open/levels:hidden">Voir la description de tous les paliers</span>
          <span className="hidden group-open/levels:inline">Masquer les paliers</span>
        </summary>
        <ol className="mt-2 grid gap-2 sm:grid-cols-2">
          {levels.map((l) => (
            <li
              key={l.points}
              className={cn(
                "space-y-1 rounded-xl border p-3 text-sm",
                l.obtained ? "border-primary bg-primary/10" : "bg-muted/30",
              )}
            >
              <p className="font-semibold">
                {fmt(l.points)} pt{l.obtained ? " · ✓ obtenu" : ""}
              </p>
              <p className="text-foreground/90">{l.description}</p>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
