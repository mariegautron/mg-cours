import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Mode présentation (projeté en classe) : plein écran, sans menu ni e-mail affiché.
 * Privé comme le reste de l'app : mêmes contrôles que `(app)/layout.tsx`.
 */
export default async function PresentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <div className="bg-background min-h-dvh">{children}</div>;
}
