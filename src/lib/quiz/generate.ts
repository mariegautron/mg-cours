/**
 * US-157 : générer un QCM depuis les questions de ressources. Fonctions pures, tirage reproductible
 * (même graine → même résultat), répartition équitable entre les ressources choisies.
 */
import { seededRandom, shuffle } from "@/lib/projects/draw";
import type { DrawRule } from "@/lib/quiz/types";
import type { QuestionType } from "@/lib/questions/types";

export interface PickInput {
  /** Questions disponibles par ressource choisie (ordre sans importance). */
  byResource: ReadonlyMap<string, readonly string[]>;
  count: number;
  seed: string;
}

export interface PickResult {
  picked: string[];
  /** Combien viennent de chaque ressource. */
  perResource: Map<string, number>;
  /** Questions demandées en trop par rapport à ce qui existe. */
  missing: number;
}

/**
 * Tire `count` questions distinctes : un tour par ressource à tour de rôle (la répartition est la plus
 * égale possible), puis le reste. Une question liée à deux ressources n'est prise qu'une fois.
 */
export function pickQuestions(input: PickInput): PickResult {
  const random = seededRandom(input.seed);
  const resources = [...input.byResource.keys()].sort();
  const queues = new Map(
    resources.map((r) => [r, shuffle([...new Set(input.byResource.get(r) ?? [])].sort(), random)]),
  );
  const order = shuffle(resources, random);
  const picked: string[] = [];
  const chosen = new Set<string>();
  const perResource = new Map(resources.map((r) => [r, 0]));
  const target = Math.max(0, Math.floor(input.count));

  let progressed = true;
  while (picked.length < target && progressed) {
    progressed = false;
    for (const r of order) {
      if (picked.length >= target) break;
      const queue = queues.get(r)!;
      while (queue.length && chosen.has(queue[0])) queue.shift();
      const next = queue.shift();
      if (next !== undefined) {
        picked.push(next);
        chosen.add(next);
        perResource.set(r, (perResource.get(r) ?? 0) + 1);
        progressed = true;
      }
    }
  }
  return { picked, perResource, missing: Math.max(0, target - picked.length) };
}

/** Questions possibles pour une sélection manuelle : l'union dédoublonnée des ressources choisies. */
export function availableQuestions(
  byResource: ReadonlyMap<string, readonly string[]>,
  resourceIds: readonly string[],
): string[] {
  return [...new Set(resourceIds.flatMap((r) => byResource.get(r) ?? []))];
}

export interface PickedQuestion {
  id: string;
  type: QuestionType;
  defaultPoints: number;
}

/**
 * Règles de tirage d'un QCM dont tout le monde reçoit les mêmes questions : une règle par type
 * (nombre = questions de ce type dans la réserve), points = le plus fréquent pour ce type.
 */
export function rulesForPool(questions: readonly PickedQuestion[]): DrawRule[] {
  const byType = new Map<QuestionType, PickedQuestion[]>();
  for (const q of questions) byType.set(q.type, [...(byType.get(q.type) ?? []), q]);
  return [...byType.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, list]) => {
      const freq = new Map<number, number>();
      for (const q of list) freq.set(q.defaultPoints, (freq.get(q.defaultPoints) ?? 0) + 1);
      const points = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
      return { category: null, tags: [], types: [type], count: list.length, pointsEach: points };
    });
}

/** Ajout / retrait d'une question dans la sélection (la sélection reste sans doublon). */
export function toggleQuestion(selected: readonly string[], id: string): string[] {
  return selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id];
}
