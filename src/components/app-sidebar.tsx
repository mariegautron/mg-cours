"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookMarked,
  GraduationCap,
  Library,
  Settings,
  Sun,
} from "lucide-react";

import { LogoMark, Mascot } from "@/components/mascot";
import { LinkPending } from "@/components/navigation-status";
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

const NAV = [
  { href: "/dashboard", label: "Aujourd’hui", icon: Sun, tone: "violet" },
  { href: "/modules", label: "Modules", icon: BookMarked, tone: "coral" },
  { href: "/students", label: "Étudiant·es", icon: GraduationCap, tone: "sky" },
  { href: "/resources", label: "Bibliothèque", icon: Library, tone: "mint" },
  { href: "/settings", label: "Réglages", icon: Settings, tone: "violet" },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="px-3 pt-4 pb-2">
        <Link href="/dashboard" className="flex items-center gap-2.5 rounded-lg px-1 py-1">
          <LogoMark />
          <span className="font-heading text-xl font-bold tracking-tight">MG COURS</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      size="lg"
                      className="data-[active=true]:halo gap-3 rounded-xl transition-colors"
                    >
                      <Link href={item.href} aria-current={active ? "page" : undefined}>
                        <span
                          className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${CHIP[item.tone]}`}
                        >
                          <item.icon aria-hidden className="size-4" />
                        </span>
                        <span className="font-medium">{item.label}</span>
                        <LinkPending />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="items-center pb-4">
        <Mascot mood="happy" className="size-16" />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
