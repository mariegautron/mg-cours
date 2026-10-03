/**
 * US-132 : constituer des groupes d'étudiant·es. Fonctions pures, tirage reproductible (même
 * graine → même résultat). Règles de Marie : taille visée, groupes d'UNE personne permis (ou
 * non), tailles équilibrées (facultatif), éviter les binômes déjà vus.
 */
import { seededRandom, shuffle } from "@/lib/projects/draw";

export interface GroupDrawInput {
  studentIds: readonly string[];
  /** Taille visée par groupe (≥ 1). */
  size: number;
  /** Groupes d'une seule personne permis ; sinon le reste est réparti dans les autres groupes. */
  allowSingle: boolean;
  /** Tailles aussi égales que possible (écart d'au plus 1) ; sinon des groupes pleins + un reste. */
  balanced: boolean;
  /** Paires déjà vues (clés de `pairKey`) à éviter autant que possible. */
  avoidPairs?: ReadonlySet<string>;
  seed: string;
}

export interface GroupDrawResult {
  groups: string[][];
  /** Paires de ce tirage qui ont déjà été vues ensemble (0 : aucune répétition). */
  repeatedPairs: number;
}

export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Paires vues dans des groupes passés. */
export function seenPairs(pastGroups: readonly (readonly string[])[]): Set<string> {
  const seen = new Set<string>();
  for (const g of pastGroups) {
    for (let i = 0; i < g.length; i++)
      for (let j = i + 1; j < g.length; j++) seen.add(pairKey(g[i], g[j]));
  }
  return seen;
}

/** Nombre de paires d'un ensemble de groupes qui figurent dans `seen`. */
export function countRepeated(
  groups: readonly (readonly string[])[],
  seen: ReadonlySet<string>,
): number {
  let n = 0;
  for (const g of groups) {
    for (let i = 0; i < g.length; i++)
      for (let j = i + 1; j < g.length; j++) if (seen.has(pairKey(g[i], g[j]))) n++;
  }
  return n;
}

/** Tailles des groupes pour `n` personnes (somme = n). */
export function groupSizes(
  n: number,
  size: number,
  allowSingle: boolean,
  balanced: boolean,
): number[] {
  if (n <= 0) return [];
  const target = Math.max(1, Math.floor(size));
  if (n <= target) return [n];
  let k = Math.ceil(n / target);
  if (balanced) {
    const base = Math.floor(n / k);
    const extra = n % k;
    const sizes = Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0));
    // Équilibré mais pas de groupe d'une personne : moins de groupes.
    if (!allowSingle && sizes.includes(1) && target > 1) {
      k = Math.max(1, k - 1);
      return groupSizes(n, Math.ceil(n / k), allowSingle, true);
    }
    return sizes;
  }
  const full = Math.floor(n / target);
  const rest = n - full * target;
  const sizes = Array.from({ length: full }, () => target);
  if (rest === 0) return sizes;
  if (rest === 1 && !allowSingle && target > 1) {
    sizes[sizes.length - 1] += 1;
    return sizes;
  }
  return [...sizes, rest];
}

const ATTEMPTS = 200;

/** Tire les groupes ; essaie plusieurs mélanges et garde celui qui répète le moins de binômes. */
export function drawGroups(input: GroupDrawInput): GroupDrawResult {
  const ids = [...new Set(input.studentIds)].sort();
  const sizes = groupSizes(ids.length, input.size, input.allowSingle, input.balanced);
  const seen = input.avoidPairs ?? new Set<string>();
  const attempts = seen.size > 0 ? ATTEMPTS : 1;

  let best: GroupDrawResult | null = null;
  for (let a = 0; a < attempts; a++) {
    const order = shuffle(ids, seededRandom(`${input.seed}#${a}`));
    const groups: string[][] = [];
    let at = 0;
    for (const s of sizes) {
      groups.push(order.slice(at, at + s));
      at += s;
    }
    const repeatedPairs = countRepeated(groups, seen);
    if (!best || repeatedPairs < best.repeatedPairs) best = { groups, repeatedPairs };
    if (repeatedPairs === 0) break;
  }
  return best ?? { groups: [], repeatedPairs: 0 };
}

/** Écart de taille entre le plus grand et le plus petit groupe. */
export function sizeSpread(groups: readonly (readonly unknown[])[]): number {
  if (groups.length === 0) return 0;
  const lens = groups.map((g) => g.length);
  return Math.max(...lens) - Math.min(...lens);
}

/** Groupes à partir d'un choix manuel : identifiant d'étudiant·e → numéro de groupe (0 = sans groupe). */
export function groupsFromChoices(
  assignments: Readonly<Record<string, number>>,
  groupCount: number,
): string[][] {
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  for (const [studentId, n] of Object.entries(assignments).sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (n >= 1 && n <= groupCount) groups[n - 1].push(studentId);
  }
  return groups.filter((g) => g.length > 0);
}

/** Noms par défaut « Groupe 1 », « Groupe 2 »… en évitant les noms déjà pris. */
export function defaultGroupNames(count: number, taken: readonly string[]): string[] {
  const used = new Set(taken.map((t) => t.trim().toLowerCase()));
  const names: string[] = [];
  let n = 1;
  while (names.length < count) {
    const name = `Groupe ${n++}`;
    if (!used.has(name.toLowerCase())) names.push(name);
  }
  return names;
}
