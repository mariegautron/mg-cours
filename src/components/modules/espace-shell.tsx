import Link from "next/link";

import type { Espace } from "@/lib/modules/espace";
import { callModuleFrise, type PublicFrise } from "@/lib/modules/frise-public";

/** Enveloppe des pages de l'espace étudiant·e : titre, navigation, pied de page. Mobile d'abord. */
export function EspaceShell({
  token,
  espace,
  current,
  publishedAt,
  children,
}: {
  token: string;
  espace: Espace | null;
  current: "accueil" | "projet" | "evaluation" | "cours";
  publishedAt?: string | null;
  children: React.ReactNode;
}) {
  const base = `/module/${token}`;
  const items = [
    { key: "accueil", label: "Accueil", href: base, show: true },
    { key: "projet", label: "Le projet", href: `${base}/projet`, show: !!espace?.brief },
    {
      key: "evaluation",
      label: "Évaluations",
      href: `${base}/evaluation/1`,
      show: !!espace?.evaluations.length,
    },
    { key: "cours", label: "Cours", href: `${base}/cours`, show: !!espace?.courses.length },
  ].filter((i) => i.show);

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <p className="font-heading border-b px-4 py-4 text-base font-bold">Espace étudiant·e</p>
      {items.length > 1 ? (
        <nav aria-label="Espace étudiant·e" className="border-b px-4 py-2">
          <ul className="flex flex-wrap gap-2">
            {items.map((i) => (
              <li key={i.key}>
                <Link
                  href={i.href}
                  aria-current={i.key === current ? "page" : undefined}
                  className={`focus-visible:ring-ring inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:outline-none ${
                    i.key === current ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                  }`}
                >
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <main className="flex-1 p-4 sm:py-6">{children}</main>
      {publishedAt ? (
        <p className="text-muted-foreground border-t px-4 py-3 text-xs">
          Mise à jour le {new Date(publishedAt).toLocaleDateString("fr-FR")}.
        </p>
      ) : null}
    </div>
  );
}

/** Message pour un lien invalide, limité ou indisponible (même page pour tout l'espace). */
export function EspaceError({ status }: { status: Exclude<PublicFrise["status"], "ok"> }) {
  const text =
    status === "throttled"
      ? ["Trop d’essais", "Réessaie dans quelques minutes."]
      : status === "unavailable"
        ? ["Page momentanément indisponible", "Réessaie dans un instant."]
        : ["Lien invalide", "Ce lien n’est plus valable. Demande-en un nouveau à ton enseignante."];
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <p className="font-heading border-b px-4 py-4 text-base font-bold">Espace étudiant·e</p>
      <main className="flex-1 space-y-2 p-4 sm:py-6">
        <h1 className="text-2xl font-semibold">{text[0]}</h1>
        <p className="text-muted-foreground">{text[1]}</p>
      </main>
    </div>
  );
}

/** Lecture de l'instantané pour une page secondaire : la consultation n'est comptée qu'à l'accueil. */
export const readEspace = (token: string) => callModuleFrise(token, false);
