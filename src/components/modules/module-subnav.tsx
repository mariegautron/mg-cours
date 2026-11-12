"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { DisclosureMenu } from "@/components/ui/disclosure-menu";
import { activeModuleNav, moduleNavItems, moduleSectionLabel } from "@/lib/modules/nav";

/**
 * Coque des sous-pages d'un module : fil d'Ariane et liens vers les zones du module. Absente sur la fiche, qui a déjà son en-tête et ses onglets.
 */
export function ModuleSubnav({
  moduleId,
  moduleName,
  archived,
}: {
  moduleId: string;
  moduleName: string;
  archived: boolean;
}) {
  const pathname = usePathname();
  const label = moduleSectionLabel(pathname, moduleId);
  if (!label) return null;
  const active = activeModuleNav(pathname, moduleId);
  const items = moduleNavItems(moduleId);
  // Tablette : 4 entrées visibles, les autres dans « Plus » (plus de défilement horizontal).
  const shown = items.slice(0, 4);
  const more = items.slice(4);

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Fil d’Ariane du module"
          className="text-muted-foreground min-w-0 text-sm break-words"
        >
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link
                href={archived ? "/modules?filter=finished" : "/modules"}
                className="hover:text-foreground focus-visible:ring-ring rounded-sm underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                {archived ? "Modules terminés" : "Modules"}
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="size-3.5" />
            </li>
            <li>
              <Link
                href={`/modules/${moduleId}`}
                className="hover:text-foreground focus-visible:ring-ring rounded-sm underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                {moduleName}
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="size-3.5" />
            </li>
            <li>
              <span aria-current="page" className="text-foreground">
                {label}
              </span>
            </li>
          </ol>
        </nav>
        {/* « Prochaine étape » : seulement sur « Où j'en suis » et Aujourd'hui (lot 2, point 11). */}
      </div>

      {/* Le menu latéral porte ces liens dès l'ordinateur ; la tablette (rail d'icônes) garde la barre. */}
      <nav
        aria-label="Sections du module (liens)"
        className="flex flex-wrap items-end gap-1 border-b max-md:hidden lg:hidden"
      >
        <ul className="flex flex-wrap gap-1">
          {shown.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={item.key === active ? "page" : undefined}
                className="text-muted-foreground hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:text-foreground -mb-px inline-flex min-h-11 items-center border-b-2 border-transparent px-3 text-sm font-medium whitespace-nowrap aria-[current=page]:font-semibold"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        {more.length > 0 ? (
          <DisclosureMenu
            label={
              more.some((i) => i.key === active)
                ? `Plus · ${more.find((i) => i.key === active)?.label}`
                : "Plus"
            }
            className="mb-1 border-transparent"
            panelClassName="right-0"
          >
            <ul className="space-y-1">
              {more.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={item.key === active ? "page" : undefined}
                    className="hover:bg-muted aria-[current=page]:text-primary flex min-h-11 items-center rounded-lg px-3 text-sm"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </DisclosureMenu>
        ) : null}
      </nav>
    </div>
  );
}
