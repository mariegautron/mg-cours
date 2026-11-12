import type { Metadata } from "next";

import { Wordmark } from "@/components/mascot";
import { ResetRequestForm } from "@/components/reset-password-forms";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/login/oubli">) {
  const { expired } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <Wordmark size="lg" />
        <ResetRequestForm expired={expired === "1"} />
      </div>
    </main>
  );
}
