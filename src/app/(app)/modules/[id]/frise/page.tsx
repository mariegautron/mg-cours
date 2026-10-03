import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FriseView } from "@/components/modules/frise-view";
import { ShareLinkPanel } from "@/components/modules/share-link-panel";
import { getShareLinkInfo, loadFrise } from "@/lib/modules/frise-queries";

export const metadata: Metadata = { title: "Frise du module" };

export default async function FrisePage({ params }: PageProps<"/modules/[id]/frise">) {
  const { id } = await params;
  const [frise, share] = await Promise.all([loadFrise(id), getShareLinkInfo(id)]);
  if (!frise) notFound();
  return (
    <div className="space-y-8">
      <FriseView frise={frise} large />
      <ShareLinkPanel moduleId={id} available={share.available} active={share.active} />
    </div>
  );
}
