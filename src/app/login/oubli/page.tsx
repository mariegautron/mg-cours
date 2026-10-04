import type { Metadata } from "next";

import { LogoMark, Mascot } from "@/components/mascot";
import { ResetRequestForm } from "@/components/reset-password-forms";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/login/oubli">) {
  const { expired } = await searchParams;
  return (
    <main className="bg-shell flex min-h-dvh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <LogoMark className="size-10" />
          <span className="font-heading text-3xl font-bold tracking-tight">MG COURS</span>
        </div>
        <Mascot mood="thinking" className="size-24" />
        <ResetRequestForm expired={expired === "1"} />
      </div>
    </main>
  );
}
