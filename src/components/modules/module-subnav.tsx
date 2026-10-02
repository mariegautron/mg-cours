"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { activeModuleNav, moduleNavItems, moduleSectionLabel } from "@/lib/modules/nav";
import type { NextStepButton } from "@/lib/modules/journey";

/**
 * Coque des sous-pages d'un module : fil d'Ariane, « Prochaine étape » et liens vers les six
 * zones du module. Absente sur la fiche, qui a déjà son en-tête et ses onglets.
 */
export function ModuleSubnav({
  moduleId,
  moduleName,
  archived,
  next,
}: {
  moduleId: string;
  moduleName: string;
  archived: boolean;
  next: NextStepButton;
}) {
  const pathname = usePathname();
  const label = moduleSectionLabel(pathname, moduleId);
  if (!label) return null;
  const active = activeModuleNav(pathname, moduleId);

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
                href={archived ? "/modules?filter=archived" : "/modules"}
                className="hover:text-foreground focus-visible:ring-ring rounded-sm underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                {archived ? "Modules archivés" : "Modules"}
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
        {next?.kind === "action" ? (
          <Button asChild size="sm" variant="outline">
            <Link href={next.href}>Prochaine étape : {next.label}</Link>
          </Button>
        ) : next ? (
          <p className="text-sm font-medium">{next.label}</p>
        ) : null}
      </div>

      <nav aria-label="Sections du module (liens)" className="-mx-1 overflow-x-auto px-1">
        <ul className="flex w-max min-w-full gap-1 border-b">
          {moduleNavItems(moduleId).map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={item.key === active ? "page" : undefined}
                className="text-muted-foreground hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:text-foreground focus-visible:ring-ring -mb-px inline-flex min-h-11 items-center border-b-2 border-transparent px-3 text-sm font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset aria-[current=page]:font-semibold"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
