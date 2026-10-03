import type { Metadata } from "next";

import { chooseName } from "@/app/q/classe/[token]/actions";
import { ClassNamePicker } from "@/components/quiz/class-name-picker";
import { CLAIM_MESSAGES } from "@/lib/quiz/class-access";
import { callClassNames } from "@/lib/quiz/class-public";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Choisir mon nom",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {children ? <p className="text-muted-foreground">{children}</p> : null}
    </section>
  );
}

export default async function ClassPage({ params, searchParams }: PageProps<"/q/classe/[token]">) {
  const { token } = await params;
  const { problem } = await searchParams;
  const res = await callClassNames(token);
  const problemText =
    typeof problem === "string" && problem in CLAIM_MESSAGES
      ? CLAIM_MESSAGES[problem as keyof typeof CLAIM_MESSAGES]
      : null;

  return (
    <main id="main" className="mx-auto w-full max-w-xl flex-1 space-y-6 p-4 sm:p-6">
      {(() => {
        switch (res.status) {
          case "ok":
            return (
              <>
                <header className="space-y-1">
                  <h1 className="text-2xl font-semibold">{res.title}</h1>
                  <p className="text-muted-foreground">
                    Choisis ton nom pour passer le QCM. Chaque nom ne peut être pris qu’une fois :
                    ne choisis pas celui de quelqu’un d’autre.
                  </p>
                </header>
                {problemText ? (
                  <p
                    role="alert"
                    className="border-destructive text-destructive rounded-md border p-3 text-sm"
                  >
                    {problemText}
                  </p>
                ) : null}
                <ClassNamePicker names={res.names} action={chooseName.bind(null, token)} />
              </>
            );
          case "not_open":
            return (
              <Message title={res.title}>
                Le QCM n’est pas encore ouvert.
                {res.opensAt
                  ? ` Ouverture : ${new Date(res.opensAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" })}.`
                  : ""}
              </Message>
            );
          case "window_closed":
            return <Message title={res.title}>Le QCM est fermé.</Message>;
          case "throttled":
            return <Message title="Trop d’essais">Réessaie dans quelques minutes.</Message>;
          case "unavailable":
            return (
              <Message title="Page momentanément indisponible">Réessaie dans un instant.</Message>
            );
          default:
            return (
              <Message title="Ce lien ne fonctionne pas">
                Demande le QR code à ton enseignante : l’ancien a peut-être été remplacé.
              </Message>
            );
        }
      })()}
    </main>
  );
}
