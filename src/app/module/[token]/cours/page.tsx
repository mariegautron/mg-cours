import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EspaceError, EspaceShell, readEspace } from "@/components/modules/espace-shell";
import { sessionHeading } from "@/lib/modules/frise";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Les cours",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function EspaceCoursPage({ params }: PageProps<"/module/[token]/cours">) {
  const { token } = await params;
  const res = await readEspace(token);
  if (res.status !== "ok") return <EspaceError status={res.status} />;
  if (!res.espace?.courses.length) notFound();
  return (
    <EspaceShell token={token} espace={res.espace} current="cours" publishedAt={res.publishedAt}>
      <h1 className="font-heading mb-4 text-2xl font-bold">Les cours</h1>
      <ul className="space-y-3">
        {res.espace.courses.map((c) => (
          <li key={c.number}>
            <Link
              href={`/module/${token}/cours/${c.number}`}
              className="bg-card focus-visible:ring-ring block min-h-11 rounded-2xl border p-4 focus-visible:ring-2 focus-visible:outline-none"
            >
              <strong>{sessionHeading(c)}</strong>
              <span className="text-muted-foreground block text-sm">
                {c.resources.map((r) => r.title).join(" · ")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </EspaceShell>
  );
}
