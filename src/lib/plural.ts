/** « 1 objectif », « 3 objectifs » : accord réel, jamais « objectif(s) ». `many` par défaut : `one` + « s ». */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n > 1 ? many : one}`;
}
