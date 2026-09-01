"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookMarked,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Library,
  Receipt,
  Settings,
} from "lucide-react";

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

const NAV = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/modules", label: "Modules", icon: BookMarked },
  { href: "/resources", label: "Ressources", icon: Library },
  { href: "/students", label: "Étudiants", icon: GraduationCap },
  { href: "/assessments", label: "Évaluations", icon: ClipboardCheck },
  { href: "/billing", label: "Facturation", icon: Receipt },
  { href: "/settings", label: "Réglages", icon: Settings },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          href="/dashboard"
          className="font-heading flex items-center gap-2 px-2 py-1.5 text-lg font-semibold"
        >
          <span aria-hidden className="text-xl">
            📚
          </span>
          MG COURS
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
                    <SidebarMenuButton asChild isActive={active}>
                      <Link href={item.href}>
                        <item.icon aria-hidden />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
