/**
 * Affectation des thèmes du projet fil rouge aux groupes (US-89).
 *
 * Règles (Marie) : les volontaires sont affectés d'abord ; les autres groupes sont tirés au sort,
 * sans remise tant qu'il reste un thème que personne n'a, puis en répartition équitable (un thème
 * n'est réutilisé que lorsque tous les thèmes ont autant de groupes). Le tirage est reproductible :
 * mêmes groupes, mêmes thèmes, mêmes volontaires et même graine → même résultat, quel que soit
 * l'ordre des listes fournies.
 */

export interface ThemeDrawInput {
  groupIds: readonly string[];
  themeIds: readonly string[];
  /** Choix des volontaires : identifiant de groupe → identifiant de thème. */
  volunteers: Readonly<Record<string, string>>;
  seed: string;
}

export interface ThemeAssignmentResult {
  groupId: string;
  themeId: string;
  method: "volunteer" | "draw";
}

/** Graine 32 bits à partir d'un texte (xmur3). */
function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** Générateur pseudo-aléatoire déterministe (mulberry32), valeurs dans [0, 1[. */
export function seededRandom(seed: string): () => number {
  let a = hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mélange de Fisher-Yates avec un générateur donné (ne modifie pas l'entrée). */
export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function drawThemes(input: ThemeDrawInput): ThemeAssignmentResult[] {
  const groups = [...new Set(input.groupIds)].sort(byId);
  const themes = [...new Set(input.themeIds)].sort(byId);
  const themeSet = new Set(themes);
  const result: ThemeAssignmentResult[] = [];
  const counts = new Map(themes.map((t) => [t, 0]));

  const drawn: string[] = [];
  for (const groupId of groups) {
    const themeId = input.volunteers[groupId];
    if (themeId && themeSet.has(themeId)) {
      result.push({ groupId, themeId, method: "volunteer" });
      counts.set(themeId, (counts.get(themeId) ?? 0) + 1);
    } else {
      drawn.push(groupId);
    }
  }
  if (themes.length === 0) return result;

  const random = seededRandom(input.seed);
  for (const groupId of shuffle(drawn, random)) {
    const least = Math.min(...counts.values());
    const candidates = themes.filter((t) => counts.get(t) === least);
    const themeId = candidates[Math.floor(random() * candidates.length)];
    counts.set(themeId, least + 1);
    result.push({ groupId, themeId, method: "draw" });
  }
  return result;
}
