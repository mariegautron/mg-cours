/** « 1 objectif », « 3 objectifs » : accord réel, jamais « objectif(s) ». `many` par défaut : `one` + « s ». */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n > 1 ? many : one}`;
}

/** « Voir l’autre » (1) ou « Voir les N autres ». */
export function seeOthers(n: number): string {
  return n === 1 ? "Voir l’autre" : `Voir les ${n} autres`;
}
