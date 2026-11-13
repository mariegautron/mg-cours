import Link from "next/link";

import type { DayJ } from "@/lib/assessments/day-j";
import { Status } from "@/components/dashboard/pill";

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
  // Les manques d'abord, puis le facultatif, puis ce qui est prêt.
  const rank = (it: DayJ["items"][number]) => (it.ok ? 2 : it.optional ? 1 : 0);
  const ordered = [...dayJ.items].sort((a, b) => rank(a) - rank(b));
  const status = (
    <Status state={dayJ.allReady ? "ready" : "todo"}>
      {dayJ.allReady ? "Prête" : `${dayJ.missing.length} à compléter`}
    </Status>
  );
  const list = (
    <ul className="space-y-0.5 text-[0.8125rem]">
      {ordered.map((it) => (
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
          Prêt pour le jour J ? {status}
          <span className="sr-only">{summary}</span>
        </summary>
        <div className="mt-1">{list}</div>
      </details>
    );
  }

  return (
    <section aria-labelledby={titleId} className="mt-2 border-t pt-2">
      <h4 id={titleId} className="mb-1 text-sm font-semibold">
        Prêt pour le jour J ? {status}
      </h4>
      {list}
    </section>
  );
}
