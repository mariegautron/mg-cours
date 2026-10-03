/**
 * « Constituer les groupes » (maquettes GroupesTirage / GroupesChoix) : le plateau de groupes sur
 * lequel Marie place, échange, verrouille et renomme. Fonctions pures, tirage reproductible.
 * Un groupe verrouillé garde tous ses membres, une personne verrouillée reste dans son groupe :
 * un nouveau tirage ne les touche pas.
 */
import { countRepeated, pairKey } from "@/lib/groups/draw-groups";
import { seededRandom, shuffle } from "@/lib/projects/draw";

export interface BoardGroup {
  id: string;
  name: string;
  members: string[];
  /** Tout le groupe est gardé tel quel pendant un nouveau tirage. */
  locked: boolean;
  /** Personnes gardées dans ce groupe même si le groupe n'est pas verrouillé. */
  lockedMembers: string[];
}

export const newGroup = (id: string, name: string): BoardGroup => ({
  id,
  name,
  members: [],
  locked: false,
  lockedMembers: [],
});

/** Tailles de `count` groupes pour `n` personnes : écart d'au plus une personne, du plus grand au plus petit. */
export function balancedSizes(n: number, count: number): number[] {
  if (n <= 0 || count <= 0) return [];
  const k = Math.min(count, n);
  const base = Math.floor(n / k);
  const extra = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0));
}

/** Nombre de groupes pour une taille visée (arrondi au-dessus), et inversement. */
export const countForSize = (n: number, size: number) =>
  n <= 0 ? 0 : Math.ceil(n / Math.max(1, Math.floor(size)));
export const sizeForCount = (n: number, count: number) =>
  count <= 0 ? 0 : Math.ceil(n / Math.max(1, Math.floor(count)));

/** « 3 groupes de 3, 3 de 2 » ; « 1 groupe de 4 ». */
export function describeSizes(sizes: readonly number[]): string {
  const counts = new Map<number, number>();
  for (const s of sizes) counts.set(s, (counts.get(s) ?? 0) + 1);
  const parts = [...counts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([size, n], i) =>
      i === 0 ? `${n} groupe${n > 1 ? "s" : ""} de ${size}` : `${n} de ${size}`,
    );
  return parts.join(", ");
}

export interface RedrawInput {
  groups: readonly BoardGroup[];
  /** Toutes les personnes à placer. */
  studentIds: readonly string[];
  avoidPairs?: ReadonlySet<string>;
  seed: string;
}

export interface RedrawResult {
  groups: BoardGroup[];
  /** Binômes de ce tirage déjà vus ensemble (0 : aucun). */
  repeatedPairs: number;
}

const ATTEMPTS = 200;

/** Personnes qui restent en place pendant un tirage : groupes verrouillés et personnes verrouillées. */
function kept(group: BoardGroup): string[] {
  return group.locked
    ? [...group.members]
    : group.members.filter((m) => group.lockedMembers.includes(m));
}

/**
 * Tire les personnes non gardées dans les groupes, en gardant les tailles aussi égales que possible
 * (les groupes qui gardent plus de monde sont complétés en dernier). Plusieurs mélanges sont essayés
 * pour répéter le moins de binômes déjà vus.
 */
export function redraw(input: RedrawInput): RedrawResult {
  const everyone = [...new Set(input.studentIds)].sort();
  const stay = input.groups.map(kept);
  const fixed = new Set(stay.flat());
  const pool = everyone.filter((id) => !fixed.has(id));
  const count = input.groups.length;
  if (count === 0) return { groups: [], repeatedPairs: 0 };

  // Taille visée par groupe, du plus rempli au moins rempli, sans jamais descendre sous ce qui est gardé.
  const sizes = balancedSizes(everyone.length, count);
  while (sizes.length < count) sizes.push(0);
  const order = input.groups.map((_, i) => i).sort((a, b) => stay[b].length - stay[a].length);
  const target: number[] = new Array(count).fill(0);
  order.forEach((groupIndex, rank) => {
    target[groupIndex] = Math.max(sizes[rank] ?? 0, stay[groupIndex].length);
  });
  // Trop de places prévues (groupes qui gardent plus que leur part) : on retire aux groupes non gardés.
  let spare = target.reduce((a, b) => a + b, 0) - (fixed.size + pool.length);
  for (let i = count - 1; spare > 0 && i >= 0; i--) {
    const g = order[i];
    const can = target[g] - stay[g].length;
    const cut = Math.min(can, spare);
    target[g] -= cut;
    spare -= cut;
  }

  const seen = input.avoidPairs ?? new Set<string>();
  const attempts = seen.size > 0 ? ATTEMPTS : 1;
  let best: RedrawResult | null = null;
  for (let a = 0; a < attempts; a++) {
    const shuffled = shuffle(pool, seededRandom(`${input.seed}#${a}`));
    let at = 0;
    const groups = input.groups.map((g, i) => {
      const need = Math.max(0, target[i] - stay[i].length);
      const added = shuffled.slice(at, at + need);
      at += need;
      return { ...g, members: [...stay[i], ...added] };
    });
    // Reste éventuel (arrondis) : aux groupes les plus petits.
    for (const extra of shuffled.slice(at)) {
      const smallest = groups.reduce(
        (m, g, i) => (g.members.length < groups[m].members.length ? i : m),
        0,
      );
      groups[smallest].members.push(extra);
    }
    const repeatedPairs = countRepeated(
      groups.map((g) => g.members),
      seen,
    );
    if (!best || repeatedPairs < best.repeatedPairs) best = { groups, repeatedPairs };
    if (repeatedPairs === 0) break;
  }
  return best!;
}

/** Place une personne dans un groupe (elle quitte son groupe actuel, sans être verrouillée). */
export function placeStudent(
  groups: readonly BoardGroup[],
  studentId: string,
  groupId: string,
): BoardGroup[] {
  return groups.map((g) => {
    const without = {
      ...g,
      members: g.members.filter((m) => m !== studentId),
      lockedMembers: g.lockedMembers.filter((m) => m !== studentId),
    };
    return g.id === groupId ? { ...without, members: [...without.members, studentId] } : without;
  });
}

/** La personne n'est plus dans aucun groupe. */
export function removeStudent(groups: readonly BoardGroup[], studentId: string): BoardGroup[] {
  return groups.map((g) => ({
    ...g,
    members: g.members.filter((m) => m !== studentId),
    lockedMembers: g.lockedMembers.filter((m) => m !== studentId),
  }));
}

/** Échange deux personnes de groupes différents ; une personne verrouillée ne change pas de groupe. */
export function swapStudents(groups: readonly BoardGroup[], a: string, b: string): BoardGroup[] {
  const home = (id: string) => groups.find((g) => g.members.includes(id));
  const ga = home(a);
  const gb = home(b);
  if (!ga || !gb || ga.id === gb.id) return [...groups];
  return groups.map((g) => {
    if (g.id === ga.id)
      return {
        ...g,
        members: g.members.map((m) => (m === a ? b : m)),
        lockedMembers: g.lockedMembers.filter((m) => m !== a),
      };
    if (g.id === gb.id)
      return {
        ...g,
        members: g.members.map((m) => (m === b ? a : m)),
        lockedMembers: g.lockedMembers.filter((m) => m !== b),
      };
    return g;
  });
}

export function toggleGroupLock(groups: readonly BoardGroup[], groupId: string): BoardGroup[] {
  return groups.map((g) => (g.id === groupId ? { ...g, locked: !g.locked } : g));
}

export function toggleMemberLock(groups: readonly BoardGroup[], studentId: string): BoardGroup[] {
  return groups.map((g) =>
    g.members.includes(studentId)
      ? {
          ...g,
          lockedMembers: g.lockedMembers.includes(studentId)
            ? g.lockedMembers.filter((m) => m !== studentId)
            : [...g.lockedMembers, studentId],
        }
      : g,
  );
}

export const renameGroup = (groups: readonly BoardGroup[], groupId: string, name: string) =>
  groups.map((g) => (g.id === groupId ? { ...g, name } : g));

/** Personnes qui n'ont encore aucun groupe. */
export function unplaced(groups: readonly BoardGroup[], studentIds: readonly string[]): string[] {
  const placed = new Set(groups.flatMap((g) => g.members));
  return studentIds.filter((id) => !placed.has(id));
}

export interface BoardSummary {
  placed: number;
  total: number;
  /** Groupes qui ont au moins une personne. */
  filled: number;
  empty: number;
  sizes: string;
  spread: number;
}

export function boardSummary(groups: readonly BoardGroup[], total: number): BoardSummary {
  const sizes = groups.map((g) => g.members.length).filter((n) => n > 0);
  return {
    placed: groups.reduce((n, g) => n + g.members.length, 0),
    total,
    filled: sizes.length,
    empty: groups.length - sizes.length,
    sizes: describeSizes(sizes),
    spread: sizes.length ? Math.max(...sizes) - Math.min(...sizes) : 0,
  };
}

/** Binômes déjà vus dans ce plateau, pour l'avertissement. */
export function repeatedIn(groups: readonly BoardGroup[], seen: ReadonlySet<string>): number {
  return countRepeated(
    groups.map((g) => g.members),
    seen,
  );
}

export { pairKey };
