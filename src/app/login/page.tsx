import { Suspense } from "react";
import type { Metadata } from "next";

import { LoginForm } from "@/components/login-form";
import { Wordmark } from "@/components/mascot";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden p-6">
      <div className="relative flex w-full max-w-sm flex-col items-center gap-6">
        <Wordmark size="lg" />
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
