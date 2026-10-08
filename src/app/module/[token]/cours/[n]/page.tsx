import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EspaceError, EspaceShell, readEspace } from "@/components/modules/espace-shell";
import { Markdown } from "@/components/markdown";
import { sessionHeading } from "@/lib/modules/frise";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Cours",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function EspaceCoursSeancePage({
  params,
}: PageProps<"/module/[token]/cours/[n]">) {
  const { token, n } = await params;
  const res = await readEspace(token);
  if (res.status !== "ok") return <EspaceError status={res.status} />;
  const course = res.espace?.courses.find((c) => c.number === Number(n));
  if (!res.espace || !course) notFound();

  /** Une image de la fiche passe par la route protégée du lien, jamais par le bucket. */
  const resolver = (resource: number) => (src: string) => {
    if (/^(https?:|data:image\/)/i.test(src)) return src;
    const last = src.split(/[?#]/)[0].split("/").pop() ?? "";
    let name = last;
    try {
      name = decodeURIComponent(last);
    } catch {
      /* nom mal encodé : gardé tel quel */
    }
    return `/module/${token}/fichier/${course.number}/${resource}/${encodeURIComponent(name)}`;
  };

  return (
    <EspaceShell token={token} espace={res.espace} current="cours" publishedAt={res.publishedAt}>
      <p className="mb-2 text-sm">
        <Link href={`/module/${token}/cours`} className="underline underline-offset-2">
          ← Tous les cours
        </Link>
      </p>
      <h1 className="font-heading mb-4 text-2xl font-bold">{sessionHeading(course)}</h1>
      <div className="space-y-10">
        {course.resources.map((r, i) => (
          <article key={i} aria-labelledby={`r-${i}`}>
            <h2 id={`r-${i}`} className="font-heading mb-1 text-xl font-bold">
              {r.title}
            </h2>
            {r.kindLabel ? (
              <p className="text-muted-foreground mb-3 text-sm">{r.kindLabel}</p>
            ) : null}
            {r.content ? (
              <Markdown source={r.content} headingLevel={3} resolveImageSrc={resolver(i)} />
            ) : null}
            {r.url ? (
              <p className="mt-3">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Ouvrir le lien<span className="sr-only"> (nouvel onglet)</span>
                </a>
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </EspaceShell>
  );
}
