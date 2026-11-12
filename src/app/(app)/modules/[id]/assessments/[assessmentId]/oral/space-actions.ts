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
import {
  copyAttendance,
  loadOralContext,
  seedFor,
  type OralContext,
} from "@/lib/assessments/oral-space-server";
import { unenrollFromMakeups } from "@/lib/assessments/makeup-queries";
import { computeTotals, gradingProgress } from "@/lib/assessments/scoring";
import { failure, NOT_FOUND } from "@/lib/messages";
import { parseCriterionComments } from "@/lib/assessments/feedback";
import {
  findNames,
  hashText,
  textFields,
  textState,
  type TextEntry,
} from "@/lib/assessments/oral-texts";
import { saveVersionedField, type SaveFieldResult } from "@/lib/assessments/versioned-save";
import { getAbsenceRuleForModule } from "@/lib/settings/rules-queries";
import { createClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/types/db";

export type { SaveFieldResult };

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
  if (name === "rule") return space.absence_rule;
  if (name === "text") return str(obj(obj(space.texts)[key]).text);
  if (name === "pcomment") return str(obj(obj(space.person_comments)[key]).text);
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
  if (name === "text" || name === "pcomment") {
    // Texte à valider : modifié à la main, il repasse « à valider » (un texte validé est comparé à son empreinte).
    const column = name === "text" ? "texts" : "person_comments";
    const current = obj(space[column]);
    const cur = obj(current[key]);
    const state =
      cur.state === "validated" || cur.state === "to_review" ? cur.state : "to_validate";
    const next = { ...current, [key]: { ...cur, text: value.slice(0, 5000), state } };
    return { [column]: next } as Partial<Space>;
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
  if (field.startsWith("presence:"))
    return saveCopyPresence(
      moduleId,
      assessmentId,
      subjectId,
      field.slice("presence:".length),
      value,
      baseVersion,
      force,
    );
  return saveVersionedField<Space>({
    supabase,
    table: "oral_space",
    load: async () => (await ensureSpace(supabase, assessmentId, subjectId))?.space ?? null,
    field,
    value,
    baseVersion,
    force,
    readField,
    patchFor: (row, f, v) => patchFor(row, f, v),
  });
}

/**
 * Présence d'une personne, écrite directement sur la copie (seule source) : `grade.attendance`
 * pour une note individuelle, `group_grade_member` pour une note de groupe. L'espace ne garde que
 * la version du champ (deux onglets ouverts : rien n'est écrasé en silence). Sans copie, une copie
 * vide (sans note) est créée pour porter la présence.
 */
async function saveCopyPresence(
  moduleId: string,
  assessmentId: string,
  subjectId: string,
  studentId: string,
  value: string,
  baseVersion: number,
  force: boolean,
): Promise<SaveFieldResult> {
  if (!isAttendance(value)) return { ok: false, error: "Présence inconnue." };
  const supabase = await createClient();
  const found = await ensureSpace(supabase, assessmentId, subjectId);
  if (!found) return { ok: false, error: "Introuvable." };
  const { space, ctx } = found;
  if (!ctx.members.some((m) => m.id === studentId))
    return { ok: false, error: "Personne inconnue." };
  const field = `presence:${studentId}`;
  const versions = obj(space.field_versions);
  const stored = typeof versions[field] === "number" ? (versions[field] as number) : 0;
  const outcome = decideFieldSave(
    { value: copyAttendance(ctx)[studentId] ?? "", version: stored },
    { baseVersion: force ? stored : baseVersion, value },
  );
  if (outcome.kind === "conflict")
    return { ok: false, conflict: true, version: outcome.version, theirs: outcome.theirs };
  if (outcome.kind === "same") return { ok: true, version: outcome.version };
  const written = await writeCopyPresence(supabase, ctx, subjectId, studentId, value);
  if (written) return { ok: false, error: written };
  await supabase
    .from("oral_space")
    .update({ field_versions: { ...versions, [field]: outcome.version } })
    .eq("id", space.id);
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}`);
  revalidatePath(`/modules/${moduleId}`);
  return { ok: true, version: outcome.version };
}

/** Écrit une présence sur la copie. Renvoie un message d'erreur, ou `null`. */
async function writeCopyPresence(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ctx: OralContext,
  subjectId: string,
  studentId: string,
  attendance: Attendance,
): Promise<string | null> {
  const fail = failure("enregistrer", { kept: true });
  const { assessment, grade } = ctx;
  if (!assessment.is_group_grade) {
    // Note individuelle : la note suit la présence (non prévenu·e 0, excusé·e sans note, présent·e
    // la note de la grille si elle est complète), comme dans la correction.
    const criteria = ctx.criteria.map((c) => ({
      id: c.id,
      weight: c.weight,
      axisId: c.axisId,
      isBonus: c.isBonus,
    }));
    const scores = Object.fromEntries(
      Object.entries((grade?.scores ?? {}) as Record<string, unknown>).filter(
        (e): e is [string, number] => typeof e[1] === "number",
      ),
    );
    const auto = assessment.auto_validated_criterion_ids;
    const full =
      criteria.length > 0 && gradingProgress(criteria, scores, auto).state === "complete"
        ? computeTotals(criteria, scores, {
            autoValidatedIds: auto,
            maxScore: assessment.max_score,
          }).value
        : criteria.length > 0
          ? null
          : (grade?.value ?? null);
    const value = individualValueFor(attendance, full);
    const res = grade
      ? await supabase.from("grade").update({ attendance, value }).eq("id", grade.id)
      : await supabase.from("grade").insert({
          assessment_id: assessment.id,
          student_id: studentId,
          student_group_id: null,
          value,
          attendance,
          scores: {},
        });
    if (res.error) return fail;
    if (grade?.attendance === "absent_excused" && attendance !== "absent_excused")
      await unenrollFromMakeups(supabase, assessment.id, studentId);
    return null;
  }
  // Note de groupe : une ligne par membre qui n'est pas « présent·e » (le mot pour la personne est gardé).
  let gradeId = grade?.id ?? null;
  if (!gradeId) {
    const { data, error } = await supabase
      .from("grade")
      .insert({
        assessment_id: assessment.id,
        student_id: null,
        student_group_id: subjectId,
        value: null,
        attendance: "present",
        scores: {},
      })
      .select("id")
      .single();
    if (error || !data) return fail;
    gradeId = data.id;
  }
  const existing = ctx.overrides.find((o) => o.student_id === studentId);
  if (attendance === "present" && !existing?.justification) {
    const { error } = await supabase
      .from("group_grade_member")
      .delete()
      .eq("grade_id", gradeId)
      .eq("student_id", studentId);
    return error ? fail : null;
  }
  const { error } = existing
    ? await supabase
        .from("group_grade_member")
        .update({ attendance })
        .eq("grade_id", gradeId)
        .eq("student_id", studentId)
    : await supabase.from("group_grade_member").insert({
        grade_id: gradeId,
        student_id: studentId,
        attendance,
        individual_factor: 1,
        justification: null,
      });
  return error ? fail : null;
}

export interface WriteState {
  error?: string;
  written?: boolean;
  /** Textes non validés, donc non écrits. */
  missingTexts?: string[];
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
  // Présences : celles de la copie, seule source (posées dans l'espace ou en correction).
  const attendance: Record<string, Attendance> = copyAttendance(ctx);
  const auto = ctx.assessment.auto_validated_criterion_ids;
  const missing = missingForWrite(ctx.criteria, letters, ctx.members, attendance, auto);
  if (missing.length > 0) return { error: missing.join(" ") };

  const hadNote = !!ctx.grade && ctx.grade.value !== null;
  if (hadNote && !confirmReplace) {
    return { error: "Confirme le remplacement de la note déjà écrite." };
  }

  const result = recap(ctx.criteria, letters, { autoValidatedIds: auto, maxScore: ctx.maxScore });
  const schoolRule = await getAbsenceRuleForModule(ctx.assessment.module_id);
  // Une seule règle, celle de la copie et des résultats (règle de l'école).
  const rule = "legacy" as const;
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

  // Textes : seuls les textes validés (et non modifiés depuis) sont écrits ; les autres sont signalés.
  const textEntries = obj(space.texts);
  const validText = (fieldId: string, letter?: string): string | null => {
    const e = obj(textEntries[fieldId]);
    const entry = {
      text: str(e.text),
      state: (e.state as TextEntry["state"]) ?? "to_validate",
      hash: typeof e.hash === "string" ? e.hash : null,
      letter: typeof e.letter === "string" ? e.letter : null,
      sources: [],
    };
    return textState(entry, letter) === "validated" ? entry.text : null;
  };
  const missingTexts: string[] = [];
  const newComments: Record<string, string> = {
    ...parseCriterionComments(ctx.grade?.criterion_comments),
  };
  const textPatch: { strengths?: string; progress?: string; feedback?: string } = {};
  for (const field of textFields(ctx.criteria)) {
    const letter = field.criterionId ? letters[field.criterionId] : undefined;
    const text = validText(field.id, letter);
    if (text === null) {
      missingTexts.push(field.label);
      continue;
    }
    if (field.criterionId) newComments[field.criterionId] = text;
    else if (field.kind === "strengths") textPatch.strengths = text;
    else if (field.kind === "progress") textPatch.progress = text;
    else textPatch.feedback = text;
  }

  const individual = !ctx.assessment.is_group_grade;
  const studentAttendance: Attendance = individual
    ? (attendance[subjectId] ?? "present")
    : "present";
  const row = {
    assessment_id: assessmentId,
    student_id: individual ? subjectId : null,
    student_group_id: individual ? null : subjectId,
    value: individual ? (perStudent[subjectId] ?? null) : result.total,
    attendance: studentAttendance,
    scores,
    criterion_comments: newComments,
    ...textPatch,
  };

  // Photo de l'état précédent : en cas d'échec, on le remet tel quel.
  const previousGrade = ctx.grade;
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
  // Les présences des membres d'un groupe sont déjà sur la copie (`group_grade_member`) : rien à
  // réécrire ici, la note de chaque personne en découle.

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
  return { written: true, missingTexts };
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
        absence_rule: written.absence_rule,
      }
    : { letters: seed.letters, absence_rule: seed.absence_rule };
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

// ── Textes à valider, propositions, répartition des notes ───────────────────

export interface TextActionState {
  error?: string;
  ok?: boolean;
}

/** Prénoms de tous les étudiant·es du module (un texte de groupe n'en contient aucun). */
async function moduleFirstNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  moduleId: string,
) {
  const { data } = await supabase
    .from("group_member")
    .select("student:student_id(first_name), student_group:student_group_id!inner(module_id)")
    .eq("student_group.module_id", moduleId);
  return (data ?? [])
    .map((r) => (r.student as unknown as { first_name: string } | null)?.first_name)
    .filter((n): n is string => !!n);
}

/** Valide un texte : empreinte et lettre mémorisées. Un texte de groupe contenant un prénom du module est refusé. */
export async function validateOralText(
  moduleId: string,
  assessmentId: string,
  subjectId: string,
  fieldId: string,
): Promise<TextActionState> {
  const supabase = await createClient();
  const found = await ensureSpace(supabase, assessmentId, subjectId);
  if (!found) return { error: NOT_FOUND.assessment };
  const { space, ctx } = found;
  const isPerson = fieldId.startsWith("pcomment:");
  const column = isPerson ? "person_comments" : "texts";
  const key = isPerson ? fieldId.slice("pcomment:".length) : fieldId;
  const entries = obj(space[column]);
  const cur = obj(entries[key]);
  const text = str(cur.text).trim();
  if (text === "") return { error: "Il n’y a pas de texte à valider." };
  if (!isPerson && ctx.assessment.is_group_grade) {
    const hits = findNames(text, await moduleFirstNames(supabase, ctx.assessment.module_id));
    if (hits.length > 0)
      return {
        error: `Un prénom apparaît dans ce texte de groupe (${[...new Set(hits.map((h) => h.name))].join(", ")}) : retire-le avant de valider.`,
      };
  }
  const letter = key.startsWith("crit:") ? str(obj(space.letters)[key.slice(5)]) : null;
  const next = {
    ...entries,
    [key]: { ...cur, text, state: "validated", hash: hashText(text), letter: letter || null },
  };
  const { error } = await supabase
    .from("oral_space")
    .update(isPerson ? { person_comments: next as Json } : { texts: next as Json })
    .eq("id", space.id);
  if (error) return { error: failure("valider le texte") };
  return { ok: true };
}

/** Pose une proposition (gabarit) dans un champ. Un texte déjà écrit n'est écrasé qu'avec `overwrite`. */
export async function applyOralProposal(
  moduleId: string,
  assessmentId: string,
  subjectId: string,
  fieldId: string,
  proposal: { text: string; segments: { text: string; source: string }[] },
  overwrite: boolean,
): Promise<TextActionState> {
  const supabase = await createClient();
  const found = await ensureSpace(supabase, assessmentId, subjectId);
  if (!found) return { error: NOT_FOUND.assessment };
  const { space } = found;
  const entries = obj(space.texts);
  const cur = obj(entries[fieldId]);
  if (str(cur.text).trim() !== "" && cur.state !== "proposed" && !overwrite)
    return { error: "Ce texte est déjà écrit : confirme pour le remplacer." };
  const next = {
    ...entries,
    [fieldId]: {
      text: proposal.text.slice(0, 5000),
      state: "proposed",
      hash: null,
      letter: null,
      sources: proposal.segments,
    },
  };
  const { error } = await supabase
    .from("oral_space")
    .update({ texts: next as Json })
    .eq("id", space.id);
  if (error) return { error: failure("proposer le texte") };
  return { ok: true };
}

export interface RoutedLine {
  key: string;
  dest: "criterion" | "person" | "notebook" | "nowhere";
  target?: string;
  text: string;
}

export interface RouteResult {
  error?: string;
  done: string[];
  failed: { key: string; reason: string }[];
}

/**
 * Répartit les notes cochées. Chaque ligne est traitée seule : si l'une échoue elle est signalée et
 * les autres restent écrites. La note d'origine reste dans le bloc-notes, marquée « répartie ».
 */
export async function routeOralNotes(
  moduleId: string,
  assessmentId: string,
  subjectId: string,
  lines: RoutedLine[],
): Promise<RouteResult> {
  const supabase = await createClient();
  const found = await ensureSpace(supabase, assessmentId, subjectId);
  if (!found) return { error: NOT_FOUND.assessment, done: [], failed: [] };
  const { space, ctx } = found;
  const texts = { ...obj(space.texts) };
  const comments = { ...obj(space.person_comments) };
  const routed = { ...obj(space.routed) };
  const done: string[] = [];
  const failed: { key: string; reason: string }[] = [];
  const append = (entries: Record<string, Json>, key: string, text: string) => {
    const cur = obj(entries[key]);
    const old = str(cur.text).trim();
    entries[key] = {
      ...cur,
      text: old ? `${old}\n${text}` : text,
      state: "to_validate",
      hash: null,
      letter: null,
    };
  };
  for (const line of lines) {
    try {
      if (line.dest === "criterion") {
        // Une remarque ne va jamais vers un texte de groupe si elle vise une personne : le client l'a déjà exclu.
        if (!line.target || !ctx.criteria.some((c) => c.id === line.target))
          throw new Error("Critère inconnu.");
        append(texts, `crit:${line.target}`, line.text);
      } else if (line.dest === "person") {
        if (!line.target || !ctx.members.some((m) => m.id === line.target))
          throw new Error("Personne inconnue.");
        append(comments, line.target, line.text);
      } else if (line.dest === "notebook") {
        const note = line.text.slice(0, 5000);
        const res =
          line.target && ctx.members.some((m) => m.id === line.target)
            ? await supabase.from("student_observation").insert({
                module_id: ctx.assessment.module_id,
                student_id: line.target,
                tag: "other",
                note,
              })
            : ctx.assessment.is_group_grade
              ? await supabase.from("group_observation").insert({
                  module_id: ctx.assessment.module_id,
                  student_group_id: subjectId,
                  tag: "other",
                  note,
                })
              : { error: { message: "Aucune personne visée." } };
        if (res.error) throw new Error("Le carnet n’a pas pu être écrit.");
      }
      routed[line.key] = { dest: line.dest, at: new Date().toISOString() };
      done.push(line.key);
    } catch (e) {
      failed.push({ key: line.key, reason: e instanceof Error ? e.message : "Échec." });
    }
  }
  const { error } = await supabase
    .from("oral_space")
    .update({ texts: texts as Json, person_comments: comments as Json, routed: routed as Json })
    .eq("id", space.id);
  if (error) return { error: failure("répartir les notes"), done: [], failed };
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}/oral`);
  return { done, failed };
}

/**
 * « Effacer la note écrite » : retire la note de ce groupe ou de cette personne (la copie
 * redevient « à corriger » ; lettres et notes privées de l'espace restent). Ce qui a déjà été
 * publié reste visible jusqu'au prochain « Mettre à jour » de l'espace.
 */
export async function clearWrittenNote(
  moduleId: string,
  assessmentId: string,
  subjectId: string,
): Promise<WriteState> {
  const supabase = await createClient();
  const found = await ensureSpace(supabase, assessmentId, subjectId);
  if (!found) return { error: NOT_FOUND.assessment };
  const { ctx, space } = found;
  const { data: rows } = await supabase
    .from("grade")
    .select("id")
    .eq("assessment_id", assessmentId)
    .eq(ctx.assessment.is_group_grade ? "student_group_id" : "student_id", subjectId);
  const ids = (rows ?? []).map((r) => r.id);
  // Une absence posée reste sur la copie (seule source de la présence) : la copie est vidée de sa
  // note mais gardée. Sans absence, elle est retirée comme avant.
  const att = copyAttendance(ctx);
  const keepPresence = Object.values(att).some((a) => a !== "present");
  if (ids.length && keepPresence) {
    const { error } = await supabase
      .from("grade")
      .update({
        value: null,
        scores: {},
        criterion_comments: {},
        strengths: null,
        progress: null,
        feedback: null,
      })
      .in("id", ids);
    if (error) return { error: failure("effacer la note") };
  } else if (ids.length) {
    await supabase.from("group_grade_member").delete().in("grade_id", ids);
    const { error } = await supabase.from("grade").delete().in("id", ids);
    if (error) return { error: failure("effacer la note") };
  }
  await supabase
    .from("oral_space")
    .update({ written: null, written_at: null, from_existing: false })
    .eq("id", space.id);
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}`);
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}/correct`);
  revalidatePath(`/modules/${moduleId}/assessments/${assessmentId}/oral`);
  revalidatePath(`/modules/${moduleId}`);
  return { written: false };
}
