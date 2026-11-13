"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookMarked,
  ClipboardCheck,
  GraduationCap,
  Library,
  Receipt,
  Settings,
  Sun,
} from "lucide-react";

import { LogoMark } from "@/components/mascot";
import { ModuleSideNav } from "@/components/modules/module-side-nav";
import { LinkPending } from "@/components/navigation-status";
import { GlobalSearch } from "@/components/search/global-search";
import { MENU_ENTRIES, type MenuKey } from "@/lib/nav/menu";
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
  assessments: { icon: ClipboardCheck },
  billing: { icon: Receipt },
  settings: { icon: Settings },
};

export const NAV_ICONS = LOOK;

export function AppSidebar() {
  const pathname = usePathname();

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
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
                      {item.key === "modules" ? <ModuleSideNav /> : null}
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
