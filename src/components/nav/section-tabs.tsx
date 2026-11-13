import Link from "next/link";

import type { NavLink } from "@/lib/nav/places";
import { cn } from "@/lib/utils";

/**
 * Onglets d'une section (lot N2). Apparence volontairement minimale et isolée ici : la DA des
 * onglets et du menu sera retravaillée par Arnaud, en un seul endroit.
 */
export function SectionTabs({
  tabs,
  active,
  label,
}: {
  tabs: NavLink[];
  active: string | null;
  label: string;
}) {
  if (tabs.length < 2) return null;
  return (
    <nav aria-label={label} className="border-b">
      <ul className="flex flex-wrap gap-x-1">
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <li key={t.key}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium",
                  on
                    ? "border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground border-transparent",
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
