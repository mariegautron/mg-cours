"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Copie excusée : « Voir son rattrapage » quand il est déjà préparé, sinon « Préparer son
 * rattrapage » (page Rattrapages du module).
 */
export function MakeupLink({ href = null }: { href?: string | null }) {
  const moduleId = usePathname()?.match(/\/modules\/([^/]+)/)?.[1];
  if (!href && !moduleId) return null;
  return (
    <Link
      href={href ?? `/modules/${moduleId}/rattrapages`}
      className="text-xs font-semibold underline underline-offset-2"
    >
      {href ? "Voir son rattrapage" : "Préparer son rattrapage"}
    </Link>
  );
}
