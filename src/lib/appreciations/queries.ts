import "server-only";

import { listModuleAssessments } from "@/lib/assessments/queries";
import { leftStudentIds } from "@/lib/students/enrollment";
import { createClient } from "@/lib/supabase/server";

export interface AppreciationsData {
  /** La table existe : sinon la page dit que la fonction arrive après la mise à jour de la base. */
  available: boolean;
  byStudent: Map<string, string>;
  /** Texte au moment du report dans Hyperplanning (absent = jamais reporté). */
  reported: Map<string, string>;
  /** Brouillons proposés, pas encore relus. */
  proposals: Set<string>;
}

/** Appréciations d'un module. Protégé : table absente ou erreur → `available: false`. */
export async function listAppreciations(moduleId: string): Promise<AppreciationsData> {
  const empty = {
    available: false,
    byStudent: new Map(),
    reported: new Map(),
    proposals: new Set<string>(),
  };
  try {
    const supabase = await createClient();
    const full = await supabase
      .from("appreciation")
      .select("student_id, text, reported_text, is_proposal")
      .eq("module_id", moduleId);
    if (!full.error && full.data) {
      return {
        available: true,
        byStudent: new Map(full.data.map((r) => [r.student_id, r.text])),
        reported: new Map(
          full.data.flatMap((r) =>
            r.reported_text !== null ? [[r.student_id, r.reported_text] as const] : [],
          ),
        ),
        proposals: new Set(full.data.filter((r) => r.is_proposal).map((r) => r.student_id)),
      };
    }
    // Base pas encore migrée : on lit au moins les textes.
    const { data, error } = await supabase
      .from("appreciation")
      .select("student_id, text")
      .eq("module_id", moduleId);
    if (error || !data) return empty;
    return {
      ...empty,
      available: true,
      byStudent: new Map(data.map((r) => [r.student_id, r.text])),
    };
  } catch {
    return empty;
  }
}

export interface AppreciationProgress {
  /** Appréciations non vides. */
  written: number;
  /** Étudiant·es du module. */
  total: number;
  /** Toutes les évaluations du module (hors bonus et rattrapages) ont au moins une note. */
  allGraded: boolean;
}

/** Avancement des appréciations d'un module (étape « Appréciations », tâche « À faire »). Protégé : 0 en cas d'erreur. */
export async function getAppreciationProgress(moduleId: string): Promise<AppreciationProgress> {
  try {
    const supabase = await createClient();
    const [{ data: members }, { data: rows }, assessments, left] = await Promise.all([
      supabase
        .from("group_member")
        .select("student_id, student_group!inner(module_id)")
        .eq("student_group.module_id", moduleId),
      supabase.from("appreciation").select("student_id, text").eq("module_id", moduleId),
      listModuleAssessments(moduleId),
      leftStudentIds(moduleId),
    ]);
    // Une personne partie du module sort du compte (« Appréciations X / N »).
    const ids = new Set((members ?? []).map((m) => m.student_id).filter((sid) => !left.has(sid)));
    const written = (rows ?? []).filter(
      (r) => r.text.trim() !== "" && ids.has(r.student_id),
    ).length;
    const counted = assessments.filter((a) => !a.makeup_of_id && !a.is_bonus);
    return {
      written,
      total: ids.size,
      allGraded: counted.length > 0 && counted.every((a) => a.gradeCount > 0),
    };
  } catch {
    return { written: 0, total: 0, allGraded: false };
  }
}

/** Formulations de Marie par partie du gabarit. Protégé : table absente → listes vides. */
export async function listPhrases(): Promise<
  Record<"strength" | "axis" | "encouragement", { id: string; text: string }[]>
> {
  const out = { strength: [], axis: [], encouragement: [] } as Record<
    "strength" | "axis" | "encouragement",
    { id: string; text: string }[]
  >;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("appreciation_phrase")
      .select("id, part, text")
      .order("created_at", { ascending: true });
    if (error) return out;
    for (const r of data ?? []) {
      if (r.part === "strength" || r.part === "axis" || r.part === "encouragement")
        out[r.part].push({ id: r.id, text: r.text });
    }
  } catch {
    // table absente : on garde les formulations de l'appli
  }
  return out;
}
