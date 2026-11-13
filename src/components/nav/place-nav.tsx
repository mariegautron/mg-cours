"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { useOpenModule } from "@/components/modules/module-nav-context";
import { SectionTabs } from "@/components/nav/section-tabs";
import { GLOBAL_ENTRIES, placeOf, tabsOf } from "@/lib/nav/places";

/** Fin du fil d'Ariane fournie par la page (objet, puis sous-page éventuelle). */
type Crumb = { label: string; href?: string };

const Ctx = createContext<{ crumbs: Crumb[]; setCrumbs: (c: Crumb[]) => void }>({
  crumbs: [],
  setCrumbs: () => {},
});

export function PlaceNavProvider({ children }: { children: React.ReactNode }) {
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const value = useMemo(() => ({ crumbs, setCrumbs }), [crumbs]);
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
    const seg = pathname.slice(base.length + 1).split("/")[0];
    all[all.length - 1] = { ...all[all.length - 1], href: base };
    all.push({ label: subPages?.[seg] ?? seg });
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
  const { crumbs } = useContext(Ctx);
  const place = placeOf(pathname);
  if (!place) return null;

  const trail: Crumb[] = [];
  if (place.moduleId) {
    trail.push({ label: "Modules", href: "/modules" });
    trail.push({
      label: openModule?.id === place.moduleId ? openModule.name : "Module",
      href: `/modules/${place.moduleId}`,
    });
    if (place.moduleEntry !== "week") trail.push({ label: place.crumb, href: place.crumbHref });
  } else {
    const entry = GLOBAL_ENTRIES.find((e) => e.key === place.menu)!;
    trail.push({ label: entry.label, href: entry.href });
    if (place.crumbHref !== entry.href) trail.push({ label: place.crumb, href: place.crumbHref });
  }
  trail.push(...crumbs);
  // Le dernier élément est la page elle-même : pas de lien.
  const last = trail.length - 1;
  const tabs = tabsOf(place);

  return (
    <div className="mb-4 space-y-2">
      {trail.length > 1 ? (
        <nav aria-label="Fil d’Ariane" className="text-muted-foreground text-[0.8125rem]">
          <ol className="flex flex-wrap items-center gap-1">
            {trail.map((c, i) => (
              <li key={`${i}-${c.label}`} className="flex items-center gap-1">
                {i > 0 ? <ChevronRight aria-hidden className="size-3.5" /> : null}
                {i < last && c.href && c.href !== pathname ? (
                  <Link
                    href={c.href}
                    className="hover:text-foreground underline-offset-2 hover:underline"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current={i === last ? "page" : undefined} className="text-foreground">
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
