import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EspaceError, EspaceShell, readEspace } from "@/components/modules/espace-shell";
import { Markdown } from "@/components/markdown";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Le projet",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function EspaceProjetPage({ params }: PageProps<"/module/[token]/projet">) {
  const { token } = await params;
  const res = await readEspace(token);
  if (res.status !== "ok") return <EspaceError status={res.status} />;
  if (!res.espace?.brief) notFound();
  return (
    <EspaceShell token={token} espace={res.espace} current="projet" publishedAt={res.publishedAt}>
      <h1 className="font-heading mb-4 text-2xl font-bold">{res.espace.brief.title}</h1>
      <Markdown source={res.espace.brief.text} headingLevel={2} />
    </EspaceShell>
  );
}
