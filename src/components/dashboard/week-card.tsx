import Link from "next/link";

import type { DayTile } from "@/lib/dashboard/overview";
import { cn } from "@/lib/utils";

const TILE = {
  // Pas de tuiles colorées (DA) : fond neutre, l'état est porté par le symbole et le mot.
  done: "bg-muted",
  today: "bg-secondary outline-1 outline-featured-border",
  upcoming: "border bg-transparent",
  empty: "bg-transparent",
} as const;

const MARK = {
  done: "text-mint",
  today: "text-primary",
  upcoming: "text-sun",
  empty: "text-muted-foreground",
} as const;

/** « Cette semaine » : cinq tuiles du lundi au vendredi (état écrit en mots, symbole décoratif). */
export function WeekCard({
  title,
  tiles,
  hrefs,
}: {
  title: string;
  tiles: DayTile[];
  /** Lien de la première séance du jour, s'il y en a une. */
  hrefs: (string | null)[];
}) {
  return (
    <section aria-labelledby="week" className="bg-card rounded-2xl border p-4">
      <h2 id="week" className="font-heading mb-3 text-lg font-bold">
        {title}
      </h2>
      <ol className="flex gap-1.5">
        {tiles.map((t, i) => {
          const inner = (
            <>
              <span className="text-muted-foreground block text-[0.75rem] font-bold">
                {t.label}
              </span>
              <span className="font-heading block text-xl font-bold">{t.day}</span>
              <span aria-hidden className={cn("block min-h-5 text-sm", MARK[t.state])}>
                {t.mark}
              </span>
              <span className="text-muted-foreground block min-h-9 text-[0.8rem] leading-tight">
                {t.caption}
              </span>
            </>
          );
          return (
            <li
              key={t.label}
              aria-current={t.isToday ? "date" : undefined}
              className={cn("min-w-0 flex-1 rounded-2xl px-1 py-2.5 text-center", TILE[t.state])}
            >
              {hrefs[i] ? (
                <Link
                  href={hrefs[i]!}
                  className="focus-visible:ring-ring block rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                >
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
