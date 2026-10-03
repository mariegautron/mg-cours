/** Suppression définitive d'un module : logique pure (confirmation par le nom, fichiers à retirer). */

/** Le nom retapé correspond-il au module ? Casse, accents et espaces multiples ignorés. */
export function nameMatches(typed: string, name: string): boolean {
  const norm = (s: string) =>
    s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
  return norm(name).length > 0 && norm(typed) === norm(name);
}

/**
 * Fichiers de stockage à supprimer avec le module : ceux de ses documents, sauf ceux que d'autres
 * lignes (un autre module, la même convention rattachée à deux modules) référencent encore.
 */
export function removablePaths(own: string[], referencedElsewhere: string[]): string[] {
  const keep = new Set(referencedElsewhere);
  return [...new Set(own)].filter((p) => !keep.has(p));
}
