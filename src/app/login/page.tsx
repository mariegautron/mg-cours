import { Suspense } from "react";
import type { Metadata } from "next";

import { LoginForm } from "@/components/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <Suspense fallback={<Skeleton className="h-80 w-full max-w-sm" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
