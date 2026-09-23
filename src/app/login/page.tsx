import { Suspense } from "react";
import type { Metadata } from "next";

import { LoginForm } from "@/components/login-form";
import { LogoMark, Mascot } from "@/components/mascot";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="bg-shell relative flex min-h-dvh items-center justify-center overflow-hidden p-6">
      <div
        aria-hidden
        className="bg-violet/20 pointer-events-none absolute -top-24 -left-24 size-96 rounded-full blur-3xl"
      />
      <div
        aria-hidden
        className="bg-coral/15 pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full blur-3xl"
      />
      <div className="relative flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <LogoMark className="size-10" />
          <span className="font-heading text-3xl font-bold tracking-tight">MG COURS</span>
        </div>
        <Mascot mood="happy" className="size-28" />
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
