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
import { isHiddenFromToday } from "@/lib/dashboard/module-labels";
import { listModules } from "@/lib/modules/queries";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  // « Mes modules en cours » du menu : non archivés, non terminés, non masqués d'Aujourd'hui.
  const runningModules = (await listModules())
    .filter((m) => !m.finished_at && !isHiddenFromToday(m))
    .map((m) => ({ id: m.id, name: m.name }));

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
        <PlaceNavProvider>
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
