import type { Metadata } from "next";

import { StudentResult } from "@/components/results/student-result";
import {
  invalidLinkText,
  INVALID_LINK_TITLE,
  throttledText,
  THROTTLED_TITLE,
  unavailableText,
  UNAVAILABLE_TITLE,
} from "@/lib/student-messages";
import { callResult } from "@/lib/result-links/public";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mon résultat",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h1>{title}</h1>
      {children ? <p className="text-muted-foreground">{children}</p> : null}
    </section>
  );
}

/** Résultats d'UNE personne par lien personnel (US-147) : aucune connexion, aucune navigation vers l'appli. */
export default async function PublicResultPage({ params }: PageProps<"/resultats/[token]">) {
  const { token } = await params;
  const result = await callResult(token);

  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 space-y-5 p-4 sm:p-6">
      {result.status === "ok" ? (
        <p className="text-muted-foreground text-sm">
          <strong className="text-foreground font-heading text-base">Espace étudiant·e</strong>
          {" › "}
          {result.sheet.moduleName}
          {" › "}
          Mon résultat
        </p>
      ) : null}
      {result.status === "ok" ? (
        <StudentResult sheet={result.sheet} token={token} />
      ) : result.status === "throttled" ? (
        <Message title={THROTTLED_TITLE}>
          Trop de liens invalides ont été essayés depuis ta connexion. {throttledText("tu")}
        </Message>
      ) : result.status === "unavailable" ? (
        <Message title={UNAVAILABLE_TITLE}>{unavailableText("tu")}</Message>
      ) : (
        <Message title={INVALID_LINK_TITLE}>{invalidLinkText("tu")}</Message>
      )}
    </main>
  );
}
