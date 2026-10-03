"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, GraduationCap, Library, Settings, Sun } from "lucide-react";

import { LogoMark, Mascot } from "@/components/mascot";
import { ModuleSideNav } from "@/components/modules/module-side-nav";
import { LinkPending } from "@/components/navigation-status";
import { GlobalSearch } from "@/components/search/global-search";
import { MENU_ENTRIES, type MenuKey } from "@/lib/nav/menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

// Classes complètes (pas de concaténation) pour que Tailwind les détecte.
const CHIP = {
  violet: "bg-violet/15 text-violet",
  coral: "bg-coral/15 text-coral",
  mint: "bg-mint/15 text-mint",
  sky: "bg-sky/15 text-sky",
  sun: "bg-sun/15 text-sun",
} as const;

const LOOK: Record<MenuKey, { icon: typeof Sun; tone: keyof typeof CHIP }> = {
  dashboard: { icon: Sun, tone: "violet" },
  modules: { icon: BookMarked, tone: "coral" },
  students: { icon: GraduationCap, tone: "sky" },
  library: { icon: Library, tone: "mint" },
  settings: { icon: Settings, tone: "violet" },
};

export const NAV_ICONS = LOOK;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3 px-3 pt-4 pb-2">
        <Link href="/dashboard" className="flex items-center gap-2.5 rounded-lg px-1 py-1">
          <LogoMark />
          <span className="font-heading text-xl font-bold tracking-tight group-data-[collapsible=icon]:sr-only">
            MG COURS
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
                        size="lg"
                        className="data-[active=true]:halo gap-3 rounded-xl transition-colors group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center"
                      >
                        <Link
                          href={item.href}
                          aria-label={item.label}
                          aria-current={active ? "page" : undefined}
                        >
                          <span
                            className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${CHIP[item.tone]}`}
                          >
                            <item.icon aria-hidden className="size-4" />
                          </span>
                          <span className="font-medium group-data-[collapsible=icon]:sr-only">
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
      <SidebarFooter className="items-center pb-4">
        <Mascot mood="happy" className="size-16 group-data-[collapsible=icon]:hidden" />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
