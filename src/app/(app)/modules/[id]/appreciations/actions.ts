"use server";

import { revalidatePath } from "next/cache";

import {
  buildTemplate,
  otherPhrase,
  PARTS,
  phraseKey,
  phrasePool,
  type CustomPhrases,
  type DraftBasis,
  type Part,
  type Sentences,
  type TemplateInput,
} from "@/lib/appreciations/draft";
import { listPhrases } from "@/lib/appreciations/queries";
import { getAppreciationBasis } from "@/lib/appreciations/basis-queries";
import { cleanAppreciation } from "@/lib/appreciations/appreciation";
import { failure } from "@/lib/messages";
import { getSchoolRulesForModule } from "@/lib/settings/rules-queries";
import { createClient } from "@/lib/supabase/server";

export interface AppreciationState {
  error?: string;
  savedAt?: string;
}

/**
 * Enregistre (ou efface) l'appréciation d'un·e étudiant·e pour un module (US-149a). Texte écrit à
 * la main : rien n'est généré. Le brouillon est toujours enregistré, même trop long : seule la copie vers Hyperplanning est bloquée.
 */
export async function saveAppreciation(
  moduleId: string,
  studentId: string,
  text: string,
): Promise<AppreciationState> {
  const cleaned = cleanAppreciation(text);

  const supabase = await createClient();
  if (cleaned === "") {
    const { error } = await supabase
      .from("appreciation")
      .delete()
      .eq("module_id", moduleId)
      .eq("student_id", studentId);
    if (error) return { error: failure("enregistrer", { kept: true }) };
  } else {
    const { error } = await supabase
      .from("appreciation")
      .upsert(
        { module_id: moduleId, student_id: studentId, text: cleaned },
        { onConflict: "module_id,student_id" },
      );
    if (error) return { error: failure("enregistrer", { kept: true }) };
  }
  return {
    savedAt: new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Paris",
    }),
  };
}

/** Coche ou décoche « Reportée dans Hyperplanning » : mémorise le texte reporté pour repérer les modifications ensuite. */
export async function setReported(
  moduleId: string,
  studentId: string,
  reported: boolean,
): Promise<AppreciationState> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("appreciation")
    .select("text")
    .eq("module_id", moduleId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!row) return { error: "Écris d’abord l’appréciation." };
  const { error } = await supabase
    .from("appreciation")
    .update({ reported_text: reported ? row.text : null })
    .eq("module_id", moduleId)
    .eq("student_id", studentId);
  if (error) return { error: failure("enregistrer", { kept: true }) };
  revalidatePath(`/modules/${moduleId}/appreciations`);
  return {};
}

export interface TemplateResult extends AppreciationState {
  text?: string;
  sentences?: Sentences;
  basis?: DraftBasis;
}

async function templateContext(moduleId: string, studentId: string) {
  const supabase = await createClient();
  const [{ appreciationMax }, basis, phrases, { data: rows }] = await Promise.all([
    getSchoolRulesForModule(moduleId),
    getAppreciationBasis(moduleId, studentId),
    listPhrases(),
    supabase.from("appreciation").select("student_id, text").eq("module_id", moduleId),
  ]);
  const input: TemplateInput = {
    seed: studentId,
    ownTags: basis.observations.map((o) => o.tag),
    groupTags: (basis.group?.observations ?? []).map((o) => o.tag),
    hasStrengthsComment: basis.comments.some((c) => c.strengths),
    hasProgressComment: basis.comments.some((c) => c.progress),
    max: appreciationMax,
  };
  const custom: CustomPhrases = {
    strength: phrases.strength.map((p) => p.text),
    axis: phrases.axis.map((p) => p.text),
    encouragement: phrases.encouragement.map((p) => p.text),
  };
  // Les appréciations des autres : aucune formulation ne doit être reprise telle quelle.
  const others = (rows ?? []).filter((r) => r.student_id !== studentId).map((r) => r.text);
  return { input, custom, others };
}

/** « Partir d'un gabarit » : trame en trois parties avec des trous à compléter. Ne l'enregistre pas. */
export async function startFromTemplate(
  moduleId: string,
  studentId: string,
): Promise<TemplateResult> {
  const { input, custom, others } = await templateContext(moduleId, studentId);
  const t = buildTemplate(input, others, custom);
  return { text: t.text, sentences: t.sentences, basis: t.basis };
}

/** « Autre formulation » pour une partie : une phrase qu'aucune autre appréciation n'emploie. */
export async function otherFormulation(
  moduleId: string,
  studentId: string,
  part: Part,
  current: string,
): Promise<{ phrase?: string; fresh?: boolean; error?: string }> {
  const { input, custom, others } = await templateContext(moduleId, studentId);
  const pool = phrasePool(part, input, custom);
  if (pool.length === 0) return { error: "Aucune autre formulation disponible." };
  return otherPhrase(pool, current, others);
}

/**
 * Après un rechargement : retrouve dans le texte les phrases issues du gabarit (même trous
 * remplis), pour garder les boutons « Autre formulation ». `null` si aucune n'est reconnue.
 */
export async function detectTemplateParts(
  moduleId: string,
  studentId: string,
  text: string,
): Promise<{ sentences: Partial<Sentences> | null }> {
  if (!text.trim()) return { sentences: null };
  const { input, custom } = await templateContext(moduleId, studentId);
  const found: Partial<Sentences> = {};
  for (const part of PARTS) {
    const hit = phrasePool(part, input, custom).find((p) => {
      const key = phraseKey(p);
      return key.length >= 8 && text.includes(key);
    });
    if (hit) found[part] = hit;
  }
  return { sentences: Object.keys(found).length ? found : null };
}
