import Link from "next/link";

import type { DayJ } from "@/lib/assessments/day-j";

/** « Prêt pour le jour J ? » : points prêts, et pour chaque manque un lien pour le compléter. */
export function DayJBlock({ dayJ, titleId }: { dayJ: DayJ; titleId: string }) {
  return (
    <section aria-labelledby={titleId} className="mt-2 border-t pt-2">
      <h4 id={titleId} className="mb-1 text-sm font-semibold">
        Prêt pour le jour J ?{" "}
        <span className="text-muted-foreground font-normal">
          {dayJ.allReady ? "Oui, tout est prêt" : `${dayJ.missing.length} à compléter`}
        </span>
      </h4>
      <ul className="space-y-0.5 text-[0.8rem]">
        {dayJ.items.map((it) => (
          <li key={it.key}>
            {it.ok ? (
              <span>
                <span aria-hidden>✓ </span>
                {it.label}
                <span className="sr-only"> : prêt</span>
              </span>
            ) : (
              <Link href={it.href} className="underline underline-offset-2">
                <span aria-hidden>! </span>
                {it.label} : {it.todo}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
