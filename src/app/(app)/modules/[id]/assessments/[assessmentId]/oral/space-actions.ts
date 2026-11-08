"use server";

import { revalidatePath } from "next/cache";

import { isAttendance, individualValueFor, type Attendance } from "@/lib/assessments/attendance";
import {
  decideFieldSave,
  isLetter,
  memberValues,
  missingForWrite,
  recap,
  scoresFromLetters,
  type WrittenSnapshot,
} from "@/lib/assessments/oral-space";
import { loadOralContext, seedFor } from "@/lib/assessments/oral-space-server";
import { failure, NOT_FOUND } from "@/lib/messages";
import { getAbsenceRuleForModule } from "@/lib/settings/rules-queries";
import { createClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/types/db";

export type SaveFieldResult =
  | { ok: true; version: number }
  | { ok: false; conflict: true; version: number; theirs: string }
  | { ok: false; conflict?: false; error: string };

type Space = Tables<"oral_space">;

const obj = (v: Json | undefined): Record<string, Json> =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, Json>) : {};
const str = (v: Json | undefined) => (typeof v === "string" ? v : "");

/** Valeur actuelle d'un champ dans la ligne `oral_space`. */
function readField(space: Space, field: string): string {
  const [name, key = ""] = [field.split(":")[0], field.split(":").slice(1).join(":")];
  if (name === "letter") return str(obj(space.letters)[key]);
  if (name === "note") return str(obj(space.criterion_notes)[key]);
  if (name === "pad") return space.pad;
  if (name === "person") return str(obj(space.person_notes)[key]);
  if (name === "presence") return str(obj(space.attendance)[key]);
  if (name === "rule") return space.absence_rule;
  return "";
}

/** Colonnes à mettre à jour pour écrire `value` dans le champ. */
function patchFor(space: Space, field: string, value: string): Partial<Space> | { error: string } {
  const name = field.split(":")[0];
  const key = field.split(":").slice(1).join(":");
  const withKey = (current: Json, v: string): Json => {
    const next = { ...obj(current) };
    if (v === "") delete next[key];
    else next[key] = v;
    return next;
  };
  if (name === "letter") {
    if (value !== "" && !isLetter(value)) return { error: "Lettre inconnue." };
    return { letters: withKey(space.letters, value) };
  }
  if (name === "note")
    return { criterion_notes: withKey(space.criterion_notes, value.slice(0, 5000)) };
  if (name === "pad") return { pad: value.slice(0, 20000) };
  if (name === "person") return { person_notes: withKey(space.person_notes, value.slice(0, 5000)) };
  if (name === "presence") {
    if (value !== "" && !isAttendance(value)) return { error: "Présence inconnue." };
    return { attendance: withKey(space.attendance, value) };
  }
  if (name === "rule") {
    if (value !== "group_all" && value !== "legacy") return { error: "Règle inconnue." };
    return { absence_rule: value };
  }
  return { error: "Champ inconnu." };
}

/** Garde le brouillon d'un espace, le crée à son état de départ au besoin. */
async function ensureSpace(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assessmentId: string,
  subjectId: string,
): Promise<{ space: Space; ctx: NonNullable<Awaited<ReturnType<typeof loadOralContext>>> } | null> {
  const ctx = await loadOralContext(supabase, assessmentId, subjectId);
  if (!ctx) return null;
  const { data: existing } = await supabase
    .from("oral_space")
    .select("*")
    .eq("assessment_id", assessmentId)
    .eq("subject_id", subjectId)
    .maybeSingle();
  if (existing) return { space: existing, ctx };
  const seed = seedFor(ctx);
  const { data: created } = await supabase
    .from("oral_space")
    .upsert(
      {
        assessment_id: assessmentId,
        subject_id: subjectId,
        letters: seed.letters,
        criterion_notes: seed.criterion_notes,
        attendance: seed.attendance,
        from_existing: seed.from_existing,
        absence_rule: seed.absence_rule,
      },
      { onConflict: "assessment_id,subject_id", ignoreDuplicates: true },
    )
    .select("*")
    .maybeSingle();
  if (created) return { space: created, ctx };
  const { data: again } = await supabase
    .from("oral_space")
    .select("*")
    .eq("assessment_id", assessmentId)
    .eq("subject_id", subjectId)
    .maybeSingle();
  return again ? { space: again, ctx } : null;
}

/**
 * Enregistre UN champ du brouillon avec sa version. Une saisie plus récente n'est jamais écrasée :
 * si le champ a changé ailleurs avec un autre contenu, on renvoie les deux versions.
 * `force` : Marie a choisi de garder sa version après un conflit.
 */
export async function saveOralField(
  moduleId: string,
  assessmentId: string,
  subjectId: string,
  field: string,
  value: string,
  baseVersion: number,
  force = false,
): Promise<SaveFieldResult> {
  const supabase = await createClient();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const found = await ensureSpace(supabase, assessmentId, subjectId);
    if (!found) return { ok: false, error: NOT_FOUND.assessment };
    const { space } = found;
    const versions = obj(space.field_versions);
    const storedVersion = typeof versions[field] === "number" ? (versions[field] as number) : 0;
    const outcome = decideFieldSave(
      { value: readField(space, field), version: storedVersion },
      { baseVersion: force ? storedVersion : baseVersion, value },
    );
    if (outcome.kind === "conflict")
      return { ok: false, conflict: true, version: outcome.version, theirs: outcome.theirs };
    if (outcome.kind === "same") return { ok: true, version: outcome.version };
    const patch = patchFor(space, field, value);
    if ("error" in patch && typeof patch.error === "string")
      return { ok: false, error: patch.error };
    // Écriture conditionnelle : si la ligne a bougé entre la lecture et l'écriture, on relit.
    const { data: updated, error } = await supabase
      .from("oral_space")
      .update({
        ...(patch as Partial<Space>),
        field_versions: { ...versions, [field]: outcome.version },
      })
      .eq("id", space.id)
      .eq("updated_at", space.updated_at)
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, error: failure("enregistrer", { kept: true }) };
    if (updated) return { ok: true, version: outcome.version };
  }
  return { ok: false, error: failure("enregistrer", { kept: true }) };
}

export interface WriteState {
  error?: string;
  written?: boolean;
}

/**
 * Écrit la note : tout ou rien. Le calcul est refait ici depuis le brouillon enregistré (jamais
 * depuis ce que le navigateur affiche). Rien n'est publié : la publication reste celle d'aujourd'hui.
 */
export async function writeOralNote(
  moduleId: string,
  assessmentId: string,
  subjectId: string,
  confirmReplace: boolean,
): Promise<WriteState> {
  const supabase = await createClient();
  const found = await ensureSpace(supabase, assessmentId, subjectId);
  if (!found) return { error: NOT_FOUND.assessment };
  const { space, ctx } = found;
  const letters = Object.fromEntries(
    Object.entries(obj(space.letters)).filter(
      (e): e is [string, string] => typeof e[1] === "string",
    ),
  );
  const attendance = Object.fromEntries(
    Object.entries(obj(space.attendance)).filter(
      (e): e is [string, Attendance] => typeof e[1] === "string" && isAttendance(e[1]),
    ),
  );
  const auto = ctx.assessment.auto_validated_criterion_ids;
  const missing = missingForWrite(ctx.criteria, letters, ctx.members, attendance, auto);
  if (missing.length > 0) return { error: missing.join(" ") };

  const hadNote = !!ctx.grade && ctx.grade.value !== null;
  if (hadNote && !confirmReplace) {
    return { error: "Confirme le remplacement de la note déjà écrite." };
  }

  const result = recap(ctx.criteria, letters, { autoValidatedIds: auto, maxScore: ctx.maxScore });
  const schoolRule = await getAbsenceRuleForModule(ctx.assessment.module_id);
  const rule = space.absence_rule === "legacy" ? "legacy" : "group_all";
  const perStudent = ctx.assessment.is_group_grade
    ? memberValues(result.total, result.maxScore, ctx.members, attendance, rule, schoolRule)
    : Object.fromEntries(
        ctx.members.map((m) => [
          m.id,
          individualValueFor(attendance[m.id] ?? "present", result.total),
        ]),
      );

  const scores = scoresFromLetters(ctx.criteria, letters);
  for (const id of auto) delete scores[id];

  const individual = !ctx.assessment.is_group_grade;
  const studentAttendance: Attendance = individual
    ? (attendance[subjectId] ?? "present")
    : "present";
  const row = {
    assessment_id: assessmentId,
    student_id: individual ? subjectId : null,
    student_group_id: individual ? null : subjectId,
    is_group_grade: !individual,
    value: individual ? (perStudent[subjectId] ?? null) : result.total,
    attendance: studentAttendance,
    scores,
  };

  // Photo de l'état précédent : en cas d'échec, on le remet tel quel.
  const previousGrade = ctx.grade;
  const previousOverrides = ctx.overrides;
  const restore = async () => {
    if (previousGrade) {
      await supabase
        .from("grade")
        .update({
          value: previousGrade.value,
          scores: previousGrade.scores,
          attendance: previousGrade.attendance,
        })
        .eq("id", previousGrade.id);
      await supabase.from("group_grade_member").delete().eq("grade_id", previousGrade.id);
      if (previousOverrides.length > 0)
        await supabase.from("group_grade_member").insert(
          previousOverrides.map((o) => ({
            grade_id: o.grade_id,
            student_id: o.student_id,
            attendance: o.attendance,
            individual_factor: o.individual_factor,
            justification: o.justification,
          })),
        );
    }
  };
  const fail = async () => {
    await restore();
    return { error: `Rien n’a été écrit. ${failure("écrire la note")}` };
  };

  const saved = previousGrade
    ? await supabase.from("grade").update(row).eq("id", previousGrade.id).select("id").single()
    : await supabase.from("grade").insert(row).select("id").single();
  if (saved.error || !saved.data) return await fail();
  const gradeId = saved.data.id;

  if (!individual) {
    const { error: clearError } = await supabase
      .from("group_grade_member")
      .delete()
      .eq("grade_id", gradeId);
    if (clearError) return await fail();
    // Règle d'origine : les absences du brouillon redeviennent des réglages individuels (le mot
    // pour la personne est conservé). Règle « tout le groupe » : aucun réglage, même note pour tous.
    if (rule === "legacy") {
      const justification = new Map(previousOverrides.map((o) => [o.student_id, o]));
      const lines = ctx.members
        .filter((m) => (attendance[m.id] ?? "present") !== "present")
        .map((m) => ({
          grade_id: gradeId,
          student_id: m.id,
          attendance: attendance[m.id] as Attendance,
          individual_factor: justification.get(m.id)?.individual_factor ?? 1,
          justification: justification.get(m.id)?.justification ?? null,
        }));
      if (lines.length > 0) {
        const { error: insertError } = await supabase.from("group_grade_member").insert(lines);
        if (insertError) return await fail();
      }
    }
  }

  const snapshot: WrittenSnapshot = {
    letters,
    attendance,
    absence_rule: rule,
    value: result.total,
    per_student: perStudent,
  };
  const { error: spaceError } = await supabase
    .from("oral_space")
    .update({ written: snapshot as unknown as Json, written_at: new Date().toISOString() })
    .eq("id", space.id);
  if (spaceError) return await fail();

  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}`);
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}/oral`);
  revalidatePath(`/modules/${moduleId}`);
  return { written: true };
}

/**
 * Abandonne le brouillon : revient exactement à l'état d'origine (note écrite par ce flux, sinon
 * note existante, sinon vide). La note écrite et les résultats publiés ne bougent pas.
 */
export async function discardOralDraft(
  moduleId: string,
  assessmentId: string,
  subjectId: string,
): Promise<WriteState> {
  const supabase = await createClient();
  const found = await ensureSpace(supabase, assessmentId, subjectId);
  if (!found) return { error: NOT_FOUND.assessment };
  const { space, ctx } = found;
  const written = space.written as unknown as WrittenSnapshot | null;
  const seed = seedFor(ctx);
  const back = written
    ? {
        letters: written.letters,
        attendance: written.attendance,
        absence_rule: written.absence_rule,
      }
    : { letters: seed.letters, attendance: seed.attendance, absence_rule: seed.absence_rule };
  const { error } = await supabase
    .from("oral_space")
    .update({
      ...back,
      criterion_notes: written ? {} : seed.criterion_notes,
      pad: "",
      person_notes: {},
      field_versions: {},
    })
    .eq("id", space.id);
  if (error) return { error: failure("abandonner le brouillon") };
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}/oral`);
  return {};
}
