import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { ModuleNavProvider } from "@/components/modules/module-nav-context";
import { RailSync } from "@/components/rail-sync";
import { GlobalSearch } from "@/components/search/global-search";
import { NavigationStatusProvider } from "@/components/navigation-status";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
        <SidebarProvider>
          <RailSync />
          <AppSidebar />
          <SidebarInset className="bg-shell min-w-0">
            <header className="flex h-14 items-center gap-2 border-b px-4">
              <SidebarTrigger className="max-md:hidden" />
              <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm max-md:sr-only">
                {user.email}
              </span>
              {/* Seule instance qui écoute Ctrl K ; le bouton n'est visible qu'au téléphone. */}
              <GlobalSearch variant="icon" hotkey className="md:hidden" />
              <ThemeToggle />
            </header>
            <div
              id="contenu"
              tabIndex={-1}
              className="flex-1 p-4 pb-20 outline-none sm:p-6 md:pb-6"
            >
              {children}
            </div>
          </SidebarInset>
          <BottomNav email={user.email ?? ""} />
        </SidebarProvider>
      </ModuleNavProvider>
    </NavigationStatusProvider>
  );
}
