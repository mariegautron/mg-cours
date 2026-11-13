"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { useOpenModule } from "@/components/modules/module-nav-context";
import { SectionTabs } from "@/components/nav/section-tabs";
import { ACTION_LABELS, GLOBAL_ENTRIES, placeOf, tabsOf } from "@/lib/nav/places";

/** Fin du fil d'Ariane fournie par la page (objet, puis sous-page éventuelle). */
type Crumb = { label: string; href?: string };

const Ctx = createContext<{
  crumbs: Crumb[];
  setCrumbs: (c: Crumb[]) => void;
  moduleNames: Record<string, string>;
}>({
  crumbs: [],
  setCrumbs: () => {},
  moduleNames: {},
});

export function PlaceNavProvider({
  children,
  moduleNames = {},
}: {
  children: React.ReactNode;
  /** Nom de chaque module (dès le rendu serveur, sans attendre l'hydratation). */
  moduleNames?: Record<string, string>;
}) {
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const value = useMemo(() => ({ crumbs, setCrumbs, moduleNames }), [crumbs, moduleNames]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Déclare la fin du fil d'Ariane d'une page : l'objet (« Étude de cas », « Séance 3 · lun.
 * 17 nov. ») puis, si besoin, la sous-page (« Corriger »). Tous sauf le dernier sont des liens.
 */
export function ObjectCrumbs({
  items,
  base,
  subPages,
}: {
  items: Crumb[];
  /** Adresse de l'objet : sur une sous-page, l'objet devient un lien et la sous-page s'ajoute. */
  base?: string;
  /** Libellé de chaque sous-page, par premier segment sous `base` (« correct » → « Corriger »). */
  subPages?: Record<string, string>;
}) {
  const { setCrumbs } = useContext(Ctx);
  const pathname = usePathname();
  const all = [...items];
  if (base && pathname !== base && pathname.startsWith(`${base}/`)) {
    all[all.length - 1] = { ...all[all.length - 1], href: base };
    // Chaque niveau connu sous l'objet (« QCM en ligne », puis « Liens et suivi ») ; chacun est un
    // lien vers sa page, la dernière est la page affichée.
    const parts = pathname.slice(base.length + 1).split("/");
    for (let i = 1; i <= parts.length; i++) {
      const rel = parts.slice(0, i).join("/");
      const label = subPages?.[rel];
      if (label) all.push({ label, href: `${base}/${rel}` });
    }
    // Le dernier niveau reconnu est la page affichée (ex. une copie sous « quiz/attempts »).
    if (all.length > items.length) all[all.length - 1] = { ...all[all.length - 1], href: pathname };
  }
  const key = JSON.stringify(all);
  useEffect(() => {
    setCrumbs(JSON.parse(key) as Crumb[]);
    return () => setCrumbs([]);
  }, [key, setCrumbs]);
  return null;
}

/**
 * Fil d'Ariane et onglets de la page courante, lus dans la table de navigation unique
 * (lots N1-N2). Rien hors de l'appli (projection, espace étudiant·e).
 */
export function PlaceNav() {
  const pathname = usePathname();
  const openModule = useOpenModule();
  const { crumbs, moduleNames } = useContext(Ctx);
  const place = placeOf(pathname);
  if (!place) return null;

  const trail: Crumb[] = [];
  if (place.moduleId) {
    trail.push({ label: "Modules", href: "/modules" });
    trail.push({
      label:
        moduleNames[place.moduleId] ??
        (openModule?.id === place.moduleId ? openModule.name : "Module"),
      href: `/modules/${place.moduleId}`,
    });
    if (place.crumbHref !== `/modules/${place.moduleId}`)
      trail.push({ label: place.crumb, href: place.crumbHref });
  } else {
    const entry = GLOBAL_ENTRIES.find((e) => e.key === place.menu)!;
    trail.push({ label: entry.label, href: entry.href });
    if (place.crumbHref !== entry.href) trail.push({ label: place.crumb, href: place.crumbHref });
  }
  trail.push(...crumbs);
  // Page d'action plus bas que la section, sans objet déclaré : son libellé termine le fil.
  if (
    crumbs.length === 0 &&
    pathname !== place.crumbHref &&
    pathname.startsWith(`${place.crumbHref}/`)
  ) {
    const seg = pathname.split("/").pop() ?? "";
    if (ACTION_LABELS[seg]) trail.push({ label: ACTION_LABELS[seg] });
  }
  // Une sous-page sans objet déclaré (Modifier, Ajouter…) : la section reste un lien.
  const last = trail.length - 1;
  const isHere = (c: Crumb, i: number) => (c.href ? c.href === pathname : i === last);
  // Onglets seulement sur les pages qui sont elles-mêmes un onglet (pas sur une évaluation, un QCM…).
  const allTabs = tabsOf(place);
  const tabs = allTabs.some((t) => t.href === pathname) ? allTabs : [];

  return (
    <div className="mb-4 space-y-2">
      {trail.length > 1 || trail[0].href !== pathname ? (
        <nav aria-label="Fil d’Ariane" className="text-muted-foreground text-[0.8125rem]">
          <ol className="flex flex-wrap items-center gap-1">
            {trail.map((c, i) => (
              <li key={`${i}-${c.label}`} className="flex items-center gap-1">
                {i > 0 ? <ChevronRight aria-hidden className="size-3.5" /> : null}
                {c.href && !isHere(c, i) ? (
                  <Link
                    href={c.href}
                    className="hover:text-foreground inline-flex min-h-11 items-center underline-offset-2 hover:underline"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span
                    aria-current={isHere(c, i) ? "page" : undefined}
                    className="text-foreground inline-flex min-h-11 items-center"
                  >
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}
      <SectionTabs tabs={tabs} active={place.tab} label="Onglets de la section" />
    </div>
  );
}
