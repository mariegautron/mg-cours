import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LogoMark, Mascot } from "@/components/mascot";
import { NewPasswordForm } from "@/components/reset-password-forms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function NewPasswordPage() {
  // Sans la session ouverte par le lien reçu par e-mail, on repart de la demande.
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login/oubli?expired=1");
  return (
    <main className="bg-shell flex min-h-dvh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <LogoMark className="size-10" />
          <span className="font-heading text-3xl font-bold tracking-tight">MG COURS</span>
        </div>
        <Mascot mood="happy" className="size-24" />
        <NewPasswordForm />
      </div>
    </main>
  );
}
