import type { Metadata } from "next";

import { FriseView } from "@/components/modules/frise-view";
import { callModuleFrise } from "@/lib/modules/frise-public";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Le module en un coup d’œil",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function SharedFrisePage({ params }: PageProps<"/module/[token]">) {
  const { token } = await params;
  const res = await callModuleFrise(token);
  if (res.status === "ok") {
    return (
      <main className="mx-auto max-w-3xl p-4 sm:p-8">
        <FriseView frise={res.frise} />
        {res.publishedAt ? (
          <p className="text-muted-foreground mt-6 text-xs">
            Mise à jour le {new Date(res.publishedAt).toLocaleDateString("fr-FR")}.
          </p>
        ) : null}
      </main>
    );
  }
  const text =
    res.status === "throttled"
      ? ["Trop d’essais", "Réessaie dans quelques minutes."]
      : res.status === "unavailable"
        ? ["Page momentanément indisponible", "Réessaie dans un instant."]
        : ["Lien invalide", "Ce lien n’est plus valable. Demande-en un nouveau à ton enseignante."];
  return (
    <main className="mx-auto max-w-3xl space-y-2 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">{text[0]}</h1>
      <p className="text-muted-foreground">{text[1]}</p>
    </main>
  );
}
