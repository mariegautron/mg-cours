/** « 1 objectif », « 3 objectifs » : accord réel, jamais « objectif(s) ». `many` par défaut : `one` + « s ». */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n > 1 ? many : one}`;
}

/** « Voir l’autre » (1) ou « Voir les N autres ». */
export function seeOthers(n: number): string {
  return n === 1 ? "Voir l’autre" : `Voir les ${n} autres`;
}

/**
 * « Séance 3 · Lancement du projet », mais « Séance 3 » quand le titre est le titre par défaut
 * (« Séance 3 ») : plus de « Séance 1 · Séance 1 ».
 */
export function sessionHeading(position: number, title: string | null | undefined): string {
  const t = (title ?? "").trim();
  if (!t || /^séance\s*\d+$/i.test(t)) return `Séance ${position}`;
  return `Séance ${position} · ${t}`;
}
