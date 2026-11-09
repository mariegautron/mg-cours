"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** « Préparer son rattrapage » : la page Rattrapages du module en cours. */
export function MakeupLink() {
  const moduleId = usePathname()?.match(/\/modules\/([^/]+)/)?.[1];
  if (!moduleId) return null;
  return (
    <Link
      href={`/modules/${moduleId}/rattrapages`}
      className="text-xs font-semibold underline underline-offset-2"
    >
      Préparer son rattrapage
    </Link>
  );
}
