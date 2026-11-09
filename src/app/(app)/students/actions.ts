"use server";

import { attachGroupsToUngroupedAssessments } from "@/lib/assessments/attach-groups";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  buildRows,
  decodeCsv,
  detectRoles,
  readTable,
  type ColumnRole,
  type NameOrder,
  type ParsedStudentRow,
  type RawTable,
} from "@/lib/students/import";
import {
  planGroupImport,
  promotionOf,
  readGroupMode,
  type GroupColumnMode,
  type GroupImportPlan,
} from "@/lib/students/module-groups";
import { readStudentForm } from "@/lib/students/schema";
import { currentSchoolYear } from "@/lib/students/years";
import { enroll } from "@/lib/students/enrollment";
import { createClient } from "@/lib/supabase/server";
import { failure, NOT_FOUND } from "@/lib/messages";

export interface StudentFormState {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

function flatten(fieldErrors: Record<string, string[] | undefined>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(fieldErrors).filter(([, v]) => v && v.length) as [string, string[]][],
  );
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Promotion d'une année scolaire (US-80b). Une promotion saisie crée ou met à jour l'inscription de
 * l'année ; vidée, elle efface la promotion d'une inscription existante sans en créer.
 */
async function savePromotion(
  supabase: Supabase,
  studentId: string,
  year: number,
  scholarGroup: string | null,
) {
  if (scholarGroup) {
    const { error } = await supabase
      .from("student_year")
      .upsert(
        { student_id: studentId, year, scholar_group: scholarGroup },
        { onConflict: "student_id,year" },
      );
    return error;
  }
  const { error } = await supabase
    .from("student_year")
    .update({ scholar_group: null })
    .eq("student_id", studentId)
    .eq("year", year);
  return error;
}

export async function createStudent(
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const parsed = readStudentForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("student")
    .insert({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      email: parsed.data.email || null,
      student_number: parsed.data.studentNumber || null,
      personal_notes: parsed.data.personalNotes || null,
    })
    .select("id")
    .single();

  if (!error && created) {
    const promoError = await savePromotion(
      supabase,
      created.id,
      parsed.data.schoolYear ?? currentSchoolYear(),
      parsed.data.scholarGroup || null,
    );
    if (promoError)
      return { error: "Étudiant·e créé·e, mais la promotion n’a pas pu être enregistrée." };
  }

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Un·e étudiant·e avec cet e-mail existe déjà."
          : failure("enregistrer", { kept: true }),
    };
  }

  revalidatePath("/students");
  // Vers la fiche créée : la liste complète (lourde) mettait plus de 6 s à se recalculer
  // derrière « Enregistrement… » alors que la fiche était déjà créée.
  redirect(`/students/${created!.id}`);
}

export async function updateStudent(
  id: string,
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const parsed = readStudentForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("student")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      email: parsed.data.email || null,
      student_number: parsed.data.studentNumber || null,
      personal_notes: parsed.data.personalNotes || null,
    })
    .eq("id", id);

  if (!error) {
    const promoError = await savePromotion(
      supabase,
      id,
      parsed.data.schoolYear ?? currentSchoolYear(),
      parsed.data.scholarGroup || null,
    );
    if (promoError) return { error: failure("enregistrer la promotion", { kept: true }) };
  }

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Un·e étudiant·e avec cet e-mail existe déjà."
          : failure("enregistrer", { kept: true }),
    };
  }

  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
  redirect(`/students/${id}`);
}

export async function deleteStudent(id: string) {
  "use server";
  const supabase = await createClient();
  await supabase.from("student").delete().eq("id", id);
  revalidatePath("/students");
  redirect("/students");
}

export interface ImportPreviewState {
  error?: string;
  rows?: ParsedStudentRow[];
  /** Tableau brut et rôle détecté de chaque colonne : l'aperçu permet de les changer. */
  table?: RawTable;
  roles?: ColumnRole[];
  nameOrder?: NameOrder;
  /** Année scolaire choisie pour l'import (année de rentrée). */
  year?: number;
  /** Lignes déjà en base (même e-mail, ou même prénom et nom) : inscrites à l'année, sans doublon. */
  knownRows?: number[];
  /** Ligne reconnue par son nom dont l'e-mail du fichier diffère de la fiche (e-mail de la fiche). */
  emailChanges?: Record<number, string | null>;
  /** Lignes déjà inscrites à cette année avec la même promotion : rien à faire. */
  enrolledRows?: number[];
  /** US-77 : sens de la colonne « groupe », module cible et groupe global. */
  mode?: GroupColumnMode;
  moduleId?: string;
  moduleName?: string;
  allGroupName?: string;
  /** Aperçu des groupes du module concernés. */
  groupPlan?: GroupImportPlan;
}

interface GroupTarget {
  mode: GroupColumnMode;
  moduleId: string | null;
  allGroupName: string;
}

/** Lit le sens de la colonne « groupe » ; sans module choisi, on retombe sur la promotion. */
function readGroupTarget(formData: FormData): GroupTarget {
  const moduleId = String(formData.get("moduleId") ?? "").trim() || null;
  const allGroupName = String(formData.get("allGroupName") ?? "")
    .trim()
    .slice(0, 100);
  if (!moduleId) return { mode: "promotion", moduleId: null, allGroupName: "" };
  return { mode: readGroupMode(formData.get("mode")), moduleId, allGroupName };
}

function readYear(formData: FormData): number {
  const raw = Number(formData.get("year"));
  return Number.isInteger(raw) && raw >= 2000 && raw <= 2100 ? raw : currentSchoolYear();
}

/** Nom comparable : sans accents, casse, tirets ni espaces en trop (« Jean-Baptiste » = « jean baptiste »). */
function nameKey(first: string, last: string): string {
  const n = (x: string) =>
    x
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  return `${n(first)}|${n(last)}`;
}

/**
 * Fiches déjà en base pour chaque ligne : même e-mail, sinon même prénom et nom (une fiche dont
 * l'e-mail a été changé n'est pas recréée). Un nom porté par plusieurs fiches n'est pas rapproché.
 */
async function matchExisting(
  supabase: Supabase,
  rows: ParsedStudentRow[],
  emails?: Map<number, string | null>,
): Promise<Map<number, string>> {
  const { data } = await supabase.from("student").select("id, email, first_name, last_name");
  const emailOf = new Map((data ?? []).map((s) => [s.id, s.email]));
  const byEmail = new Map<string, string>();
  const byName = new Map<string, string | null>();
  for (const s of data ?? []) {
    if (s.email) byEmail.set(s.email.toLowerCase(), s.id);
    const key = nameKey(s.first_name, s.last_name);
    byName.set(key, byName.has(key) ? null : s.id);
  }
  const out = new Map<number, string>();
  for (const r of rows) {
    const id =
      (r.email ? byEmail.get(r.email) : undefined) ??
      byName.get(nameKey(r.firstName, r.lastName)) ??
      null;
    if (id) {
      out.set(r.rowNumber, id);
      emails?.set(r.rowNumber, emailOf.get(id) ?? null);
    }
  }
  return out;
}

/** Étape 1 : parse le fichier et renvoie un aperçu, sans rien écrire. */
export async function previewStudentsImport(
  _prev: ImportPreviewState,
  formData: FormData,
): Promise<ImportPreviewState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choisis un fichier CSV ou XLSX." };
  }
  const year = readYear(formData);
  const target = readGroupTarget(formData);

  let rows: ParsedStudentRow[];
  let table: RawTable;
  let roles: ColumnRole[];
  let nameOrder: NameOrder;
  try {
    const buffer = await file.arrayBuffer();
    const name = file.name.toLowerCase();
    const isText =
      name.endsWith(".csv") ||
      name.endsWith(".txt") ||
      name.endsWith(".tsv") ||
      file.type.startsWith("text/");
    // CSV : décodé par nous (UTF-8, sinon Windows-1252) puis lu avec détection du séparateur.
    table = readTable(isText ? decodeCsv(buffer) : buffer);
    ({ roles, nameOrder } = detectRoles(table.headers));
    rows = buildRows(table, roles, { nameOrder });
  } catch {
    return { error: "Fichier illisible. Vérifie le format (CSV ou XLSX)." };
  }

  if (rows.length === 0) return { error: "Le fichier ne contient aucune ligne." };

  const supabase = await createClient();
  let moduleName: string | undefined;
  let groupPlan: GroupImportPlan | undefined;
  if (target.moduleId) {
    const [{ data: mod }, { data: groups }] = await Promise.all([
      supabase.from("module").select("name").eq("id", target.moduleId).maybeSingle(),
      supabase.from("student_group").select("name").eq("module_id", target.moduleId),
    ]);
    if (!mod) return { error: NOT_FOUND.module };
    moduleName = mod.name;
    groupPlan = planGroupImport(
      rows.filter((r) => r.errors.length === 0),
      target,
      groups ?? [],
    );
  }

  const ficheEmails = new Map<number, string | null>();
  const known = await matchExisting(supabase, rows, ficheEmails);
  // E-mail du fichier différent de celui de la fiche : signalé dans l'aperçu (la fiche ne change pas).
  const emailChanges = Object.fromEntries(
    rows.flatMap((r) => {
      if (!known.has(r.rowNumber) || !r.email) return [];
      const current = ficheEmails.get(r.rowNumber) ?? null;
      return current?.toLowerCase() === r.email ? [] : [[r.rowNumber, current]];
    }),
  ) as Record<number, string | null>;
  const knownIds = [...new Set(known.values())];
  const { data: enrolled } = knownIds.length
    ? await supabase
        .from("student_year")
        .select("student_id, scholar_group")
        .eq("year", year)
        .in("student_id", knownIds)
    : { data: [] };
  const groupById = new Map((enrolled ?? []).map((e) => [e.student_id, e.scholar_group]));
  const enrolledRows = rows
    .filter((r) => {
      const id = known.get(r.rowNumber);
      if (!id || !groupById.has(id)) return false;
      const wanted = promotionOf(r, target.mode);
      return !wanted || wanted === groupById.get(id);
    })
    .map((r) => r.rowNumber);

  return {
    rows,
    table,
    roles,
    nameOrder,
    year,
    knownRows: [...known.keys()],
    emailChanges,
    enrolledRows,
    mode: target.mode,
    moduleId: target.moduleId ?? undefined,
    moduleName,
    allGroupName: target.allGroupName,
    groupPlan,
  };
}

export interface ImportConfirmState {
  error?: string;
  created?: number;
  /** Étudiant·es déjà en base inscrit·es (ou mis·es à jour) pour l'année choisie. */
  enrolled?: number;
  year?: number;
  /** US-77 : appartenances ajoutées et groupes créés dans le module. */
  memberships?: number;
  groupsCreated?: number;
  moduleName?: string;
  moduleId?: string;
}

/**
 * Étape 2 : réinsère les lignes validées côté client (JSON caché) et écrit en base. Les
 * étudiant·es déjà en base ne sont pas dupliqué·es : leur promotion de l'année choisie est
 * ajoutée ou mise à jour (US-80b), sans toucher au reste de leur fiche ni aux autres années.
 */
export async function confirmStudentsImport(
  _prev: ImportConfirmState,
  formData: FormData,
): Promise<ImportConfirmState> {
  const raw = formData.get("rows");
  if (typeof raw !== "string") return { error: "Import invalide. Recommence." };
  const year = readYear(formData);
  const target = readGroupTarget(formData);

  let rows: ParsedStudentRow[];
  try {
    rows = JSON.parse(raw);
  } catch {
    return { error: "Import invalide. Recommence." };
  }

  const validRows = rows.filter((r) => r.errors.length === 0);
  if (validRows.length === 0) return { error: "Aucune ligne valide à importer." };

  const supabase = await createClient();
  const known = await matchExisting(supabase, validRows);
  const idOf = (r: ParsedStudentRow) => known.get(r.rowNumber)!;

  const newRows = validRows.filter((r) => !known.has(r.rowNumber));
  const existingRows = validRows.filter((r) => known.has(r.rowNumber));

  // Nouveaux : création, puis inscription à l'année (l'ordre de retour suit celui de l'envoi).
  const enrollments: { student_id: string; year: number; scholar_group: string | null }[] = [];
  const createdIds: string[] = [];
  if (newRows.length) {
    const { data: created, error } = await supabase
      .from("student")
      .insert(
        newRows.map((r) => ({
          first_name: r.firstName,
          last_name: r.lastName,
          email: r.email,
          student_number: r.studentNumber,
        })),
      )
      .select("id");
    if (error || !created || created.length !== newRows.length) {
      return { error: failure("importer les étudiant·es") };
    }
    createdIds.push(...created.map((s) => s.id));
    created.forEach((s, i) =>
      enrollments.push({
        student_id: s.id,
        year,
        scholar_group: promotionOf(newRows[i], target.mode),
      }),
    );
  }

  // Déjà en base : inscription à l'année choisie, sans écraser une promotion par du vide.
  let enrolled = 0;
  if (existingRows.length) {
    const ids = existingRows.map(idOf);
    const { data: already } = await supabase
      .from("student_year")
      .select("student_id, scholar_group")
      .eq("year", year)
      .in("student_id", ids);
    const groupById = new Map((already ?? []).map((a) => [a.student_id, a.scholar_group]));
    for (const r of existingRows) {
      const id = idOf(r);
      const known = groupById.has(id);
      const promotion = promotionOf(r, target.mode);
      if (known && (!promotion || promotion === groupById.get(id))) continue;
      enrollments.push({ student_id: id, year, scholar_group: promotion });
      enrolled++;
    }
  }

  if (enrollments.length) {
    const { error } = await supabase
      .from("student_year")
      .upsert(enrollments, { onConflict: "student_id,year" });
    if (error) return { error: failure("inscrire les étudiant·es à l’année") };
  }

  // US-77 : groupes du module (créés au besoin) puis appartenances, recalculés côté serveur.
  let memberships = 0;
  let groupsCreated = 0;
  let moduleName: string | undefined;
  if (target.moduleId) {
    const [{ data: mod }, { data: groups }] = await Promise.all([
      supabase.from("module").select("id, name").eq("id", target.moduleId).maybeSingle(),
      supabase.from("student_group").select("id, name").eq("module_id", target.moduleId),
    ]);
    if (!mod) return { error: NOT_FOUND.module };
    moduleName = mod.name;

    const plan = planGroupImport(validRows, target, groups ?? []);
    const idByGroup = new Map((groups ?? []).map((g) => [g.name, g.id]));
    const toCreate = plan.groups.filter((g) => g.isNew).map((g) => g.name);
    if (toCreate.length) {
      const { data: made, error } = await supabase
        .from("student_group")
        .insert(
          toCreate.map((name) => ({ module_id: target.moduleId!, name, type: "tp" as const })),
        )
        .select("id, name");
      if (error || !made) return { error: failure("créer les groupes") };
      for (const g of made) idByGroup.set(g.name, g.id);
      groupsCreated = made.length;
      await attachGroupsToUngroupedAssessments(
        supabase,
        target.moduleId,
        made.map((g) => g.id),
      );
    }

    const studentByRow = new Map<number, string>();
    newRows.forEach((r, i) => studentByRow.set(r.rowNumber, createdIds[i]));
    for (const r of existingRows) studentByRow.set(r.rowNumber, idOf(r));
    // Import lancé avec un module : tout le monde y est inscrit, groupes ou non.
    await enroll(supabase, target.moduleId, [...studentByRow.values()]);

    const links = plan.memberships.flatMap((m) => {
      const student_id = studentByRow.get(m.rowNumber);
      const student_group_id = idByGroup.get(m.groupName);
      return student_id && student_group_id ? [{ student_id, student_group_id }] : [];
    });
    if (links.length) {
      const { error } = await supabase
        .from("group_member")
        .upsert(links, { onConflict: "student_group_id,student_id", ignoreDuplicates: true });
      if (error) return { error: failure("ajouter aux groupes") };
    }
    memberships = links.length;
    revalidatePath(`/modules/${target.moduleId}`);
  }

  if (newRows.length === 0 && enrolled === 0 && memberships === 0) {
    return { error: "Tout le monde est déjà inscrit·e à cette année." };
  }

  revalidatePath("/students");
  return {
    created: newRows.length,
    enrolled,
    year,
    memberships,
    groupsCreated,
    moduleName,
    moduleId: target.moduleId ?? undefined,
  };
}
