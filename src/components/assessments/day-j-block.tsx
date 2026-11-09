import Link from "next/link";

import type { DayJ } from "@/lib/assessments/day-j";
import { cn } from "@/lib/utils";

/**
 * « Prêt pour le jour J ? » : points prêts, et pour chaque manque un lien pour le compléter.
 * Replié par défaut avec son résumé (`collapsible`) ; un clic le déplie.
 */
export function DayJBlock({
  dayJ,
  titleId,
  collapsible = false,
  defaultOpen = false,
}: {
  dayJ: DayJ;
  titleId: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const summary = dayJ.allReady ? "Prête pour le jour J" : `${dayJ.missing.length} à compléter`;
  const list = (
    <ul className="space-y-0.5 text-[0.8rem]">
      {dayJ.items.map((it) => (
        <li key={it.key}>
          {it.ok ? (
            <span>
              <span aria-hidden>✓ </span>
              {it.label}
              <span className="sr-only"> : prêt</span>
            </span>
          ) : it.optional ? (
            <Link href={it.href} className="text-muted-foreground underline underline-offset-2">
              {it.label}
            </Link>
          ) : (
            <Link href={it.href} className="underline underline-offset-2">
              <span aria-hidden>! </span>
              {it.label} : {it.todo}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );

  if (collapsible) {
    return (
      <details open={defaultOpen} className="group mt-2 border-t pt-2">
        <summary
          id={titleId}
          className="hover:bg-muted/50 cursor-pointer rounded-sm text-sm font-semibold"
        >
          Prêt pour le jour J ?{" "}
          <span
            className={cn("font-normal", dayJ.allReady ? "text-mint" : "text-muted-foreground")}
          >
            {summary}
          </span>
        </summary>
        <div className="mt-1">{list}</div>
      </details>
    );
  }

  return (
    <section aria-labelledby={titleId} className="mt-2 border-t pt-2">
      <h4 id={titleId} className="mb-1 text-sm font-semibold">
        Prêt pour le jour J ?{" "}
        <span className="text-muted-foreground font-normal">
          {dayJ.allReady ? "Oui, tout est prêt" : `${dayJ.missing.length} à compléter`}
        </span>
      </h4>
      {list}
    </section>
  );
}
