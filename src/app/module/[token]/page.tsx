import type { Metadata } from "next";

import { FriseStudent } from "@/components/modules/frise-view";
import { callModuleFrise } from "@/lib/modules/frise-public";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Le module en un coup d’œil",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <p className="font-heading border-b px-4 py-4 text-base font-bold">Espace étudiant·e</p>
      <main className="flex-1 p-4 sm:py-6">{children}</main>
    </div>
  );
}

export default async function SharedFrisePage({ params }: PageProps<"/module/[token]">) {
  const { token } = await params;
  const res = await callModuleFrise(token);
  if (res.status === "ok") {
    return (
      <Shell>
        <FriseStudent frise={res.frise} today={new Date().toISOString().slice(0, 10)} />
        {res.publishedAt ? (
          <p className="text-muted-foreground mt-6 text-xs">
            Mise à jour le {new Date(res.publishedAt).toLocaleDateString("fr-FR")}.
          </p>
        ) : null}
      </Shell>
    );
  }
  const text =
    res.status === "throttled"
      ? ["Trop d’essais", "Réessaie dans quelques minutes."]
      : res.status === "unavailable"
        ? ["Page momentanément indisponible", "Réessaie dans un instant."]
        : ["Lien invalide", "Ce lien n’est plus valable. Demande-en un nouveau à ton enseignante."];
  return (
    <Shell>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{text[0]}</h1>
        <p className="text-muted-foreground">{text[1]}</p>
      </div>
    </Shell>
  );
}
