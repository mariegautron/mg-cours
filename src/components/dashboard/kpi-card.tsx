import { cn } from "@/lib/utils";

const CHIP = {
  // Pastille d'icône monochrome ; seule la barre garde la couleur de son statut.
  violet: { chip: "bg-muted text-muted-foreground", bar: "bg-primary" },
  mint: { chip: "bg-muted text-muted-foreground", bar: "bg-mint" },
  sky: { chip: "bg-muted text-muted-foreground", bar: "bg-sky" },
  sun: { chip: "bg-muted text-muted-foreground", bar: "bg-sun" },
} as const;

/** Tuile chiffrée de l'accueil : icône, libellé, grand chiffre, barre de progression, précision. */
export function KpiCard({
  tone,
  icon,
  label,
  value,
  percent,
  barLabel,
  detail,
}: {
  tone: keyof typeof CHIP;
  icon: React.ReactNode;
  label: string;
  value: string;
  /** Barre de progression 0–100 (décorative : `barLabel` la dit en mots pour les lecteurs d'écran). */
  percent: number;
  barLabel: string;
  detail: string;
}) {
  const t = CHIP[tone];
  return (
    <section aria-label={label} className="bg-card rounded-xl border p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", t.chip)}
        >
          {icon}
        </span>
        <div>
          <p className="text-muted-foreground text-[0.8125rem]">{label}</p>
          <p className="font-heading text-3xl leading-none font-bold">{value}</p>
        </div>
      </div>
      <div aria-hidden className="bg-foreground/10 mt-3 mb-1.5 h-1.5 overflow-hidden rounded-full">
        <span className={cn("block h-full", t.bar)} style={{ width: `${percent}%` }} />
      </div>
      <p className="text-muted-foreground text-[0.8125rem]">
        <span className="sr-only">{barLabel}. </span>
        {detail}
      </p>
    </section>
  );
}
