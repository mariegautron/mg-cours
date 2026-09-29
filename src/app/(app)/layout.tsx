import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
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
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-shell">
          <header className="flex h-14 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <span className="text-muted-foreground flex-1 text-sm">{user.email}</span>
            <ThemeToggle />
          </header>
          <div id="contenu" tabIndex={-1} className="flex-1 p-6 outline-none">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </NavigationStatusProvider>
  );
}
