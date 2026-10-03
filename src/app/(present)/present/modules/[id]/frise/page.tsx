import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FriseProjected } from "@/components/modules/frise-view";
import { PresentShell } from "@/components/present/present-shell";
import { loadFrise } from "@/lib/modules/frise-queries";

export const metadata: Metadata = { title: "Frise du module — présentation" };

/** La frise du module projetée en classe : une diapositive, sans menu, grande typographie. */
export default async function PresentFrisePage({
  params,
}: PageProps<"/present/modules/[id]/frise">) {
  const { id } = await params;
  const frise = await loadFrise(id);
  if (!frise) notFound();
  return (
    <PresentShell
      title={`${frise.moduleName} — la frise du module`}
      backHref={`/modules/${id}/frise`}
      backLabel="la frise du module"
      sections={["Frise"]}
      slides={[
        { section: 0, label: frise.moduleName, node: <FriseProjected frise={frise} large /> },
      ]}
    />
  );
}
