import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";

import { clientEnv } from "@/lib/env";
import { feedbackUrl } from "@/lib/feedback/questions";
import { getModule } from "@/lib/modules/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Questionnaire d’avis : QR code" };

/** QR du questionnaire d'avis, projeté en classe : gros QR et lien court, aucun nom. */
export default async function ProjectedFeedbackQrPage({
  params,
}: PageProps<"/present/modules/[id]/feedback">) {
  const { id } = await params;
  const mod = await getModule(id);
  if (!mod) notFound();
  const { data: link } = await (
    await createClient()
  )
    .from("module_feedback_link")
    .select("token")
    .eq("module_id", id)
    .is("revoked_at", null)
    .maybeSingle();
  const url = link ? feedbackUrl(clientEnv.NEXT_PUBLIC_APP_URL, link.token) : null;
  const svg = url
    ? await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
    : null;
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center gap-8 p-10">
      <div>
        <p className="text-muted-foreground text-xl">{mod.name}</p>
        <h1 className="font-heading text-6xl leading-tight font-bold tracking-tight">
          Ton avis sur le module
        </h1>
        <p className="text-2xl">Anonyme, 5 minutes, aucun lien avec ta note.</p>
      </div>
      {url && svg ? (
        <div className="flex flex-wrap items-center gap-10">
          <div
            role="img"
            aria-label="QR code vers le questionnaire"
            className="w-80 bg-white p-3 [&_svg]:h-auto [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <div className="min-w-0 space-y-3">
            <p className="text-muted-foreground text-lg">ou saisis l’adresse</p>
            <p className="font-heading text-2xl font-bold break-all">{url}</p>
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-xl">
          Pas encore de lien : crée-le depuis « Retour des étudiant·es ».
        </p>
      )}
      <p>
        <Link
          href={`/modules/${id}/feedback`}
          className="text-muted-foreground text-sm underline underline-offset-2"
        >
          ← Retour des étudiant·es
        </Link>
      </p>
    </main>
  );
}
