/**
 * Enregistrement sans écrasement : deux onglets ouverts sur la même copie ne s'effacent plus. Chaque
 * champ (un critère, un commentaire) est comparé à la version que l'onglet avait à l'ouverture (`base`) :
 * seuls les champs réellement modifiés par cet onglet sont écrits sur la version actuelle de la base.
 */
export interface GradeContent {
  scores: Record<string, number>;
  /** Commentaires par critère / axe / attendus (`criterion_comments`). */
  comments: Record<string, string>;
  strengths: string | null;
  progress: string | null;
  feedback: string | null;
}

export interface MergeResult {
  merged: GradeContent;
  /** Champs modifiés dans les deux onglets, avec des valeurs différentes : rien n'est écrasé. */
  conflicts: string[];
  /** Champs modifiés ailleurs que cet onglet n'a pas touchés (conservés tels quels). */
  changedElsewhere: string[];
}

const same = (a: unknown, b: unknown) => (a ?? null) === (b ?? null);

function mergeRecord<T extends number | string>(
  base: Record<string, T>,
  mine: Record<string, T>,
  current: Record<string, T>,
  prefix: string,
  out: { conflicts: string[]; elsewhere: string[] },
): Record<string, T> {
  const result: Record<string, T> = { ...current };
  const keys = new Set([...Object.keys(base), ...Object.keys(mine), ...Object.keys(current)]);
  for (const key of keys) {
    if (same(mine[key], base[key])) {
      // Pas touché ici : on garde ce que la base contient maintenant.
      if (!same(current[key], base[key])) out.elsewhere.push(`${prefix}${key}`);
      continue;
    }
    if (!same(current[key], base[key]) && !same(current[key], mine[key])) {
      out.conflicts.push(`${prefix}${key}`);
      continue;
    }
    if (mine[key] === undefined) delete result[key];
    else result[key] = mine[key];
  }
  return result;
}

export function mergeGradeContent(
  base: GradeContent,
  mine: GradeContent,
  current: GradeContent,
): MergeResult {
  const out = { conflicts: [] as string[], elsewhere: [] as string[] };
  const scores = mergeRecord(base.scores, mine.scores, current.scores, "score:", out);
  const comments = mergeRecord(base.comments, mine.comments, current.comments, "comment:", out);
  const text = (field: "strengths" | "progress" | "feedback"): string | null => {
    if (same(mine[field], base[field])) {
      if (!same(current[field], base[field])) out.elsewhere.push(field);
      return current[field] ?? null;
    }
    if (!same(current[field], base[field]) && !same(current[field], mine[field])) {
      out.conflicts.push(field);
      return current[field] ?? null;
    }
    return mine[field] ?? null;
  };
  return {
    merged: {
      scores,
      comments,
      strengths: text("strengths"),
      progress: text("progress"),
      feedback: text("feedback"),
    },
    conflicts: out.conflicts,
    changedElsewhere: out.elsewhere,
  };
}

/** Relit la version de base envoyée par l'onglet (`null` si absente ou illisible : enregistrement classique). */
export function parseGradeBase(raw: FormDataEntryValue | null): GradeContent | null {
  if (typeof raw !== "string" || raw === "") return null;
  try {
    const v = JSON.parse(raw) as Partial<GradeContent>;
    const rec = (x: unknown) =>
      x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, never>) : {};
    const str = (x: unknown) => (typeof x === "string" && x !== "" ? x : null);
    return {
      scores: Object.fromEntries(
        Object.entries(rec(v.scores)).filter(([, n]) => typeof n === "number"),
      ) as Record<string, number>,
      comments: Object.fromEntries(
        Object.entries(rec(v.comments)).filter(([, t]) => typeof t === "string"),
      ) as Record<string, string>,
      strengths: str(v.strengths),
      progress: str(v.progress),
      feedback: str(v.feedback),
    };
  } catch {
    return null;
  }
}
