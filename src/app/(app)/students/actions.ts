"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseStudentsFile, type ParsedStudentRow } from "@/lib/students/import";
import { readStudentForm } from "@/lib/students/schema";
import { currentSchoolYear } from "@/lib/students/years";
import { createClient } from "@/lib/supabase/server";

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
          : "Enregistrement impossible.",
    };
  }

  revalidatePath("/students");
  redirect("/students");
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
    if (promoError) return { error: "Enregistrement de la promotion impossible. Réessayez." };
  }

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Un·e étudiant·e avec cet e-mail existe déjà."
          : "Enregistrement impossible.",
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
  /** Année scolaire choisie pour l'import (année de rentrée). */
  year?: number;
  /** e-mails déjà présents en base : ces étudiant·es seront inscrit·es à l'année, sans doublon. */
  existingEmails?: string[];
  /** e-mails déjà inscrits à cette année avec la même promotion : rien à faire. */
  enrolledEmails?: string[];
}

function readYear(formData: FormData): number {
  const raw = Number(formData.get("year"));
  return Number.isInteger(raw) && raw >= 2000 && raw <= 2100 ? raw : currentSchoolYear();
}

/** Étape 1 : parse le fichier et renvoie un aperçu, sans rien écrire. */
export async function previewStudentsImport(
  _prev: ImportPreviewState,
  formData: FormData,
): Promise<ImportPreviewState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choisissez un fichier CSV ou XLSX." };
  }
  const year = readYear(formData);

  let rows: ParsedStudentRow[];
  try {
    const buffer = await file.arrayBuffer();
    const isCsv = file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
    // XLSX.read en mode "array" décode les octets en Latin-1 : pour du CSV (texte),
    // on décode nous-mêmes en UTF-8 avant de parser (voir src/lib/students/import.ts).
    rows = parseStudentsFile(isCsv ? new TextDecoder("utf-8").decode(buffer) : buffer);
  } catch {
    return { error: "Fichier illisible. Vérifiez le format (CSV ou XLSX)." };
  }

  if (rows.length === 0) return { error: "Le fichier ne contient aucune ligne." };

  const supabase = await createClient();
  const emails = rows.map((r) => r.email).filter((e): e is string => !!e);
  const { data: existing } =
    emails.length > 0
      ? await supabase.from("student").select("id, email").in("email", emails)
      : { data: [] };

  const existingRows = (existing ?? []).filter((e) => e.email);
  const { data: enrolled } = existingRows.length
    ? await supabase
        .from("student_year")
        .select("student_id, scholar_group")
        .eq("year", year)
        .in(
          "student_id",
          existingRows.map((e) => e.id),
        )
    : { data: [] };
  const groupById = new Map((enrolled ?? []).map((e) => [e.student_id, e.scholar_group]));
  const byEmail = new Map(rows.map((r) => [r.email, r.scholarGroup]));
  const enrolledEmails = existingRows
    .filter((e) => {
      if (!groupById.has(e.id)) return false;
      const wanted = byEmail.get(e.email);
      return !wanted || wanted === groupById.get(e.id);
    })
    .map((e) => e.email!);

  return {
    rows,
    year,
    existingEmails: existingRows.map((e) => e.email!),
    enrolledEmails,
  };
}

export interface ImportConfirmState {
  error?: string;
  created?: number;
  /** Étudiant·es déjà en base inscrit·es (ou mis·es à jour) pour l'année choisie. */
  enrolled?: number;
  year?: number;
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
  if (typeof raw !== "string") return { error: "Import invalide. Recommencez." };
  const year = readYear(formData);

  let rows: ParsedStudentRow[];
  try {
    rows = JSON.parse(raw);
  } catch {
    return { error: "Import invalide. Recommencez." };
  }

  const validRows = rows.filter((r) => r.errors.length === 0);
  if (validRows.length === 0) return { error: "Aucune ligne valide à importer." };

  const supabase = await createClient();
  const emails = validRows.map((r) => r.email).filter((e): e is string => !!e);
  const { data: existing } =
    emails.length > 0
      ? await supabase.from("student").select("id, email").in("email", emails)
      : { data: [] };
  const idByEmail = new Map((existing ?? []).map((e) => [e.email, e.id]));

  const newRows = validRows.filter((r) => !r.email || !idByEmail.has(r.email));
  const existingRows = validRows.filter((r) => r.email && idByEmail.has(r.email));

  // Nouveaux : création, puis inscription à l'année (l'ordre de retour suit celui de l'envoi).
  const enrollments: { student_id: string; year: number; scholar_group: string | null }[] = [];
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
      return { error: "Import impossible. Réessayez." };
    }
    created.forEach((s, i) =>
      enrollments.push({ student_id: s.id, year, scholar_group: newRows[i].scholarGroup }),
    );
  }

  // Déjà en base : inscription à l'année choisie, sans écraser une promotion par du vide.
  let enrolled = 0;
  if (existingRows.length) {
    const ids = existingRows.map((r) => idByEmail.get(r.email!)!);
    const { data: already } = await supabase
      .from("student_year")
      .select("student_id, scholar_group")
      .eq("year", year)
      .in("student_id", ids);
    const groupById = new Map((already ?? []).map((a) => [a.student_id, a.scholar_group]));
    for (const r of existingRows) {
      const id = idByEmail.get(r.email!)!;
      const known = groupById.has(id);
      if (known && (!r.scholarGroup || r.scholarGroup === groupById.get(id))) continue;
      enrollments.push({ student_id: id, year, scholar_group: r.scholarGroup });
      enrolled++;
    }
  }

  if (enrollments.length) {
    const { error } = await supabase
      .from("student_year")
      .upsert(enrollments, { onConflict: "student_id,year" });
    if (error) return { error: "Inscription à l’année impossible. Réessayez." };
  }

  if (newRows.length === 0 && enrolled === 0) {
    return { error: "Tout le monde est déjà inscrit·e à cette année." };
  }

  revalidatePath("/students");
  return { created: newRows.length, enrolled, year };
}
