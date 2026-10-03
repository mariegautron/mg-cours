"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { LinkPending } from "@/components/navigation-status";
import { useOpenModule } from "@/components/modules/module-nav-context";
import { activeModuleNav, moduleNavItems } from "@/lib/modules/nav";

/**
 * Menu du module ouvert, sous « Modules » dans le menu latéral (et dans le tiroir du téléphone) :
 * nom du module en petit titre, puis ses six entrées. Repliable au clavier.
 */
export function ModuleSideNav({
  variant = "sidebar",
  onNavigate,
}: {
  variant?: "sidebar" | "drawer";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const open = useOpenModule();
  const [collapsedId, setCollapsedId] = useState<string | null>(null);
  const listId = useId();
  if (!open || !pathname.startsWith(`/modules/${open.id}`)) return null;

  const expanded = collapsedId !== open.id;
  const active = activeModuleNav(pathname, open.id);
  const link =
    "text-muted-foreground hover:text-foreground aria-[current=page]:bg-sidebar-accent aria-[current=page]:text-foreground focus-visible:ring-ring flex min-h-11 items-center rounded-lg px-2.5 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none aria-[current=page]:font-semibold";

  return (
    <div
      className={
        variant === "sidebar"
          ? "mt-0.5 mb-2 ml-5 border-l pl-2.5 group-data-[collapsible=icon]:hidden"
          : "mb-2 ml-5 border-l pl-2.5"
      }
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-primary min-w-0 truncate px-2 py-1 text-[0.8rem] font-bold">
          {open.name}
        </span>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-label={expanded ? "Replier le menu du module" : "Déplier le menu du module"}
          onClick={() => setCollapsedId(expanded ? open.id : null)}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex size-11 shrink-0 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
        >
          <ChevronDown
            aria-hidden
            className={`size-4 transition-transform motion-reduce:transition-none ${expanded ? "" : "-rotate-90"}`}
          />
        </button>
      </div>
      <nav id={listId} aria-label={open.name} hidden={!expanded}>
        <ul className="flex flex-col gap-0.5">
          {moduleNavItems(open.id).map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={item.key === active ? "page" : undefined}
                className={link}
              >
                {item.label}
                <LinkPending />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
