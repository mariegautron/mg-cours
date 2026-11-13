"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { DisclosureMenu } from "@/components/ui/disclosure-menu";
import { activeModuleNav, moduleNavItems, moduleSectionLabel } from "@/lib/modules/nav";

/**
 * Menu du module sur tablette (le menu latéral n'est alors qu'un rail d'icônes) : 4 entrées
 * visibles, les autres dans « Plus ». Sur ordinateur, le menu latéral porte ces liens.
 */
export function ModuleSubnav({ moduleId }: { moduleId: string }) {
  const pathname = usePathname();
  // Le fil d'Ariane et les onglets sont dans `PlaceNav` (table de navigation unique).
  if (!moduleSectionLabel(pathname, moduleId)) return null;
  const active = activeModuleNav(pathname, moduleId);
  const items = moduleNavItems(moduleId);
  // Tablette : 4 entrées visibles, les autres dans « Plus » (plus de défilement horizontal).
  const shown = items.slice(0, 4);
  const more = items.slice(4);

  return (
    <div className="mb-3">
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
