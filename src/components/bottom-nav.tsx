"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis } from "lucide-react";

import { NAV_ICONS } from "@/components/app-sidebar";
import { LinkPending } from "@/components/navigation-status";
import { GlobalSearch } from "@/components/search/global-search";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { activeEntry, entriesForForm } from "@/lib/nav/menu";

/**
 * Menu du téléphone (< 768 px, US-118) : barre du bas à quatre entrées + « Plus » (tiroir avec le
 * reste, la recherche, le thème et le compte). Cibles de 44 px minimum, aucun défilement
 * horizontal dès 320 px. Masquée dès la tablette (le rail prend le relais).
 */
export function BottomNav({ email }: { email: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { main, drawer } = entriesForForm("bottom");
  const current = activeEntry(pathname);
  const drawerActive = drawer.some((e) => e.key === current);
  const item =
    "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[0.7rem] font-medium leading-tight";

  return (
    <>
      <nav
        aria-label="Menu principal"
        className="bg-background fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="flex">
          {main.map((e) => {
            const Icon = NAV_ICONS[e.key].icon;
            const active = current === e.key;
            return (
              <li key={e.key} className="flex min-w-0 flex-1">
                <Link
                  href={e.href}
                  aria-current={active ? "page" : undefined}
                  className={`${item} focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none ${active ? "text-primary" : "text-muted-foreground"}`}
                >
                  <Icon aria-hidden className="size-5" />
                  <span className="max-w-full truncate">{e.label}</span>
                  <LinkPending />
                </Link>
              </li>
            );
          })}
          <li className="flex min-w-0 flex-1">
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className={`${item} focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none ${drawerActive ? "text-primary" : "text-muted-foreground"}`}
            >
              <Ellipsis aria-hidden className="size-5" />
              <span>Plus</span>
            </button>
          </li>
        </ul>
      </nav>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="gap-4 p-4 pb-8">
          <SheetHeader className="p-0">
            <SheetTitle>Plus</SheetTitle>
            <SheetDescription className="sr-only">
              Réglages, recherche, thème et compte.
            </SheetDescription>
          </SheetHeader>
          <GlobalSearch />
          <nav aria-label="Autres pages">
            <ul className="space-y-1">
              {drawer.map((e) => {
                const Icon = NAV_ICONS[e.key].icon;
                return (
                  <li key={e.key}>
                    <Link
                      href={e.href}
                      onClick={() => setOpen(false)}
                      aria-current={current === e.key ? "page" : undefined}
                      className="hover:bg-muted flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium"
                    >
                      <Icon aria-hidden className="size-5" />
                      {e.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex items-center justify-between gap-2 border-t pt-3">
            <span className="text-muted-foreground min-w-0 truncate text-sm">{email}</span>
            <ThemeToggle />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
