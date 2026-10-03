import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Presentation } from "lucide-react";

import { FriseProjected, FriseStudent } from "@/components/modules/frise-view";
import { ShareLinkPanel } from "@/components/modules/share-link-panel";
import { Button } from "@/components/ui/button";
import { getShareLinkInfo, loadFrise } from "@/lib/modules/frise-queries";

export const metadata: Metadata = { title: "Frise du module" };

export default async function FrisePage({ params }: PageProps<"/modules/[id]/frise">) {
  const { id } = await params;
  const [frise, share] = await Promise.all([loadFrise(id), getShareLinkInfo(id)]);
  if (!frise) notFound();
  const today = new Date().toISOString().slice(0, 10);
  const card = "bg-card rounded-3xl border p-5 shadow-sm";

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-primary mb-1.5 text-xs font-bold tracking-widest uppercase">
            Où j’en suis
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">La frise du module</h1>
          <p className="text-muted-foreground mt-1">
            Les séances et les notes en un coup d’œil : à projeter en classe, ou à partager aux
            étudiant·es par un lien.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/present/modules/${id}/frise`}>
              <Presentation aria-hidden />
              Projeter la frise
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/modules/${id}`}>← Retour au module</Link>
          </Button>
        </div>
      </div>

      <section aria-label="Aperçu de la frise projetée" className={card}>
        <FriseProjected frise={frise} embedded />
      </section>

      <div className="flex flex-wrap items-start gap-5 lg:flex-nowrap">
        <div className="w-full min-w-0 flex-1 lg:basis-0">
          <ShareLinkPanel moduleId={id} available={share.available} active={share.active} />
        </div>
        <section
          aria-labelledby="etu"
          className={`${card} w-full min-w-0 lg:w-[26rem] lg:flex-none`}
        >
          <h2 id="etu" className="font-heading mb-1 text-xl font-bold">
            Ce que voient les étudiant·es
          </h2>
          <p className="text-muted-foreground mb-3 text-sm">
            La page du lien, sur un téléphone : l’état au moment où tu crées le lien.
          </p>
          <div className="bg-background rounded-2xl border p-4">
            <FriseStudent frise={frise} today={today} embedded />
          </div>
        </section>
      </div>
    </div>
  );
}
