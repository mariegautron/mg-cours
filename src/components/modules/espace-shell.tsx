import Link from "next/link";

import { ContactLine } from "@/components/modules/contact-line";

import type { Espace } from "@/lib/modules/espace";
import {
  INVALID_LINK_TITLE,
  invalidLinkText,
  THROTTLED_TITLE,
  throttledText,
  UNAVAILABLE_TITLE,
  unavailableText,
} from "@/lib/student-messages";
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
    {
      key: "evaluation",
      label: "Évaluations",
      href: `${base}/evaluation/1`,
      show: !!espace?.evaluations.length,
    },
    { key: "cours", label: "Cours", href: `${base}/cours`, show: !!espace?.courses.length },
    { key: "projet", label: "Projet", href: `${base}/projet`, show: !!espace?.brief },
  ].filter((i) => i.show);

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <p className="font-heading border-b px-4 py-4 text-base font-bold">Espace de la classe</p>
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
      <div className="text-muted-foreground space-y-1 border-t px-4 py-3 text-xs">
        <ContactLine tone="vous" />
        {publishedAt ? (
          <p>Mise à jour le {new Date(publishedAt).toLocaleDateString("fr-FR")}.</p>
        ) : null}
      </div>
    </div>
  );
}

/** Message pour un lien invalide, limité ou indisponible (même page pour tout l'espace). */
export function EspaceError({
  status,
  tone = "vous",
}: {
  status: Exclude<PublicFrise["status"], "ok">;
  /** « tu » pour l'espace personnel, « vous » pour le lien de la classe. */
  tone?: "tu" | "vous";
}) {
  const text =
    status === "throttled"
      ? [THROTTLED_TITLE, throttledText(tone)]
      : status === "unavailable"
        ? [UNAVAILABLE_TITLE, unavailableText(tone)]
        : [INVALID_LINK_TITLE, invalidLinkText(tone)];
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <p className="font-heading border-b px-4 py-4 text-base font-bold">Espace étudiant·e</p>
      <main className="flex-1 space-y-2 p-4 sm:py-6">
        <h1>{text[0]}</h1>
        <p className="text-muted-foreground">{text[1]}</p>
        <ContactLine tone={tone} className="text-muted-foreground pt-2" />
      </main>
    </div>
  );
}

/** Lecture de l'instantané pour une page secondaire : la consultation n'est comptée qu'à l'accueil. */
export const readEspace = (token: string) => callModuleFrise(token, false);
