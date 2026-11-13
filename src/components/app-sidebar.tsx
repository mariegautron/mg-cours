"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, GraduationCap, Library, Receipt, Settings, Sun } from "lucide-react";

import { LogoMark } from "@/components/mascot";
import { ModuleSideNav } from "@/components/modules/module-side-nav";
import { LinkPending } from "@/components/navigation-status";
import { GlobalSearch } from "@/components/search/global-search";
import { activeEntry, MENU_ENTRIES, type MenuKey } from "@/lib/nav/menu";
import { placeOf, sameSectionIn } from "@/lib/nav/places";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

// Icônes monochromes (DA « Studio de nuit ») : plus de tuiles de couleur, l'élément actif prend l'accent.
const LOOK: Record<MenuKey, { icon: typeof Sun }> = {
  dashboard: { icon: Sun },
  modules: { icon: BookMarked },
  students: { icon: GraduationCap },
  library: { icon: Library },
  billing: { icon: Receipt },
  settings: { icon: Settings },
};

export const NAV_ICONS = LOOK;

export function AppSidebar({
  runningModules = [],
}: {
  /** « Mes modules en cours » : non terminés et non masqués d'Aujourd'hui. */
  runningModules?: { id: string; name: string; year?: string | null }[];
}) {
  const pathname = usePathname();
  const place = placeOf(pathname);
  // Au plus 8 modules, puis « Tous les modules » (entrée du menu).
  const shownModules = runningModules.slice(0, 8);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3 px-3 pt-4 pb-2">
        <Link
          href="/dashboard"
          aria-label="Marelle, aller à Aujourd'hui"
          className="flex items-center gap-2.5 rounded-lg px-1 py-1"
        >
          <LogoMark />
          <span className="title-display text-xl leading-none lowercase group-data-[collapsible=icon]:sr-only">
            Marelle
          </span>
        </Link>
        <GlobalSearch className="group-data-[collapsible=icon]:hidden" />
        <div className="hidden justify-center group-data-[collapsible=icon]:flex">
          <GlobalSearch variant="icon" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <nav aria-label="Menu principal">
              <SidebarMenu>
                {MENU_ENTRIES.map((entry) => {
                  const item = { ...entry, ...LOOK[entry.key] };
                  const active = activeEntry(pathname) === item.key;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        size="lg"
                        className="text-muted-foreground data-active:text-foreground data-active:[&_svg]:text-primary relative h-[2.125rem] gap-2.5 overflow-visible rounded-lg text-sm font-medium transition-colors group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center after:absolute after:inset-x-0 after:-inset-y-[5px] after:content-[''] [&_svg]:size-4"
                      >
                        <Link
                          href={item.href}
                          aria-label={item.label}
                          aria-current={active ? "page" : undefined}
                        >
                          <item.icon aria-hidden className="size-4 shrink-0" />
                          <span className="group-data-[collapsible=icon]:sr-only">
                            {item.label}
                          </span>
                          <LinkPending />
                        </Link>
                      </SidebarMenuButton>
                      {item.key === "modules" ? (
                        <ModuleSideNav exclude={shownModules.map((m) => m.id)} />
                      ) : null}
                      {item.key === "dashboard" && shownModules.length > 0 ? (
                        <div className="mt-2 mb-1 group-data-[collapsible=icon]:hidden">
                          <p
                            id="my-modules"
                            className="text-muted-foreground-2 px-2 pb-1 text-xs font-medium"
                          >
                            Mes modules en cours
                          </p>
                          <ul aria-labelledby="my-modules" className="flex flex-col">
                            {shownModules.map((m) => {
                              const here = place?.moduleId === m.id;
                              return (
                                <li key={m.id}>
                                  {/* Changer de module garde la section (Évaluations → Évaluations). */}
                                  <Link
                                    href={sameSectionIn(pathname, m.id)}
                                    title={m.year ? `${m.name} (${m.year})` : m.name}
                                    className={`hover:bg-sidebar-accent flex min-h-11 items-center rounded-lg px-2 text-sm ${
                                      here ? "text-foreground font-medium" : "text-muted-foreground"
                                    }`}
                                  >
                                    <span className="line-clamp-2 min-w-0 break-words">
                                      {m.name}
                                    </span>
                                  </Link>
                                  {here ? <ModuleSideNav only={m.id} hideTitle /> : null}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
