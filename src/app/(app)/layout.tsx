import { redirect } from "next/navigation";

import { AccountMenu } from "@/components/account-menu";
import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { ModuleNavProvider } from "@/components/modules/module-nav-context";
import { PlaceNav, PlaceNavProvider } from "@/components/nav/place-nav";
import { RailSync } from "@/components/rail-sync";
import { GlobalSearch } from "@/components/search/global-search";
import { NavigationStatusProvider } from "@/components/navigation-status";
import { OfflineBanner } from "@/components/offline-banner";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";
import { isHiddenFromToday, moduleLabels } from "@/lib/dashboard/module-labels";
import { todayInParis } from "@/lib/modules/next-session";
import { listModules } from "@/lib/modules/queries";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  // « Mes modules en cours » du menu : non archivés, non terminés, non masqués d'Aujourd'hui.
  const allModules = await listModules({ includeArchived: true });
  // Deux modules du même nom (une année sur l'autre) : l'année scolaire partout (menu, fil d'Ariane).
  const labels = moduleLabels(allModules);
  // « Mes modules en cours » : la même règle qu'Aujourd'hui (séances récentes ou à venir), triés
  // par séance la plus proche. Modules non terminés, non masqués.
  const today = todayInParis();
  const shift = (d: number) =>
    new Date(Date.parse(`${today}T12:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10);
  const { data: dated } = await supabase
    .from("course")
    .select("module_id, session_date")
    .gte("session_date", shift(-14))
    .lte("session_date", shift(45));
  const nearest = new Map<string, number>();
  for (const c of dated ?? []) {
    if (!c.session_date) continue;
    const dist = Math.abs(Date.parse(c.session_date) - Date.parse(today));
    nearest.set(c.module_id, Math.min(nearest.get(c.module_id) ?? Infinity, dist));
  }
  const runningModules = allModules
    .filter((m) => !m.archived_at && !m.finished_at && !isHiddenFromToday(m) && nearest.has(m.id))
    .sort((a, b) => (nearest.get(a.id) ?? 0) - (nearest.get(b.id) ?? 0))
    .map((m) => ({ id: m.id, name: labels.get(m.id) ?? m.name }));
  const moduleNames = Object.fromEntries(allModules.map((m) => [m.id, labels.get(m.id) ?? m.name]));

  return (
    <NavigationStatusProvider>
      {/* Lien d'évitement (RGAA 12.7) : premier élément focusable, visible au focus. */}
      <a
        href="#contenu"
        className="bg-primary text-primary-foreground focus-visible:ring-ring sr-only rounded-lg px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus-visible:ring-3 focus-visible:outline-none"
      >
        Aller au contenu
      </a>
      <ModuleNavProvider>
        <PlaceNavProvider moduleNames={moduleNames}>
          <SidebarProvider>
            <RailSync />
            <AppSidebar runningModules={runningModules} />
            <SidebarInset className="min-w-0">
              <header className="flex h-14 items-center gap-2 border-b px-4">
                <SidebarTrigger className="max-md:hidden" />
                <div className="min-w-0 flex-1 max-md:hidden">
                  <AccountMenu email={user.email ?? ""} />
                </div>
                <span className="flex-1 md:hidden" />
                {/* Seule instance qui écoute Ctrl K ; le bouton n'est visible qu'au téléphone. */}
                <GlobalSearch variant="icon" hotkey className="md:hidden" />
                <ThemeToggle />
              </header>
              <OfflineBanner />
              <div
                id="contenu"
                tabIndex={-1}
                className="flex-1 p-4 pb-20 outline-none sm:p-6 md:pb-6"
              >
                <PlaceNav />
                {children}
              </div>
            </SidebarInset>
            <BottomNav email={user.email ?? ""} />
          </SidebarProvider>
        </PlaceNavProvider>
      </ModuleNavProvider>
    </NavigationStatusProvider>
  );
}
