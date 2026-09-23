"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { parseStudentsFile, type ParsedStudentRow } from "@/lib/students/import";
import { readStudentForm } from "@/lib/students/schema";
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

export async function createStudent(
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const parsed = readStudentForm(formData);
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.flatten().fieldErrors) };

  const supabase = await createClient();
  const { error } = await supabase.from("student").insert({
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    email: parsed.data.email || null,
    student_number: parsed.data.studentNumber || null,
    scholar_group: parsed.data.scholarGroup || null,
    personal_notes: parsed.data.personalNotes || null,
  });

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
      scholar_group: parsed.data.scholarGroup || null,
      personal_notes: parsed.data.personalNotes || null,
    })
    .eq("id", id);

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
  /** e-mails déjà présents en base, pour affichage dans l'aperçu. */
  existingEmails?: string[];
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
      ? await supabase.from("student").select("email").in("email", emails)
      : { data: [] };

  return { rows, existingEmails: (existing ?? []).map((e) => e.email!).filter(Boolean) };
}

export interface ImportConfirmState {
  error?: string;
  created?: number;
}

/** Étape 2 : réinsère les lignes validées côté client (JSON caché) et écrit en base. */
export async function confirmStudentsImport(
  _prev: ImportConfirmState,
  formData: FormData,
): Promise<ImportConfirmState> {
  const raw = formData.get("rows");
  if (typeof raw !== "string") return { error: "Import invalide. Recommencez." };

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
      ? await supabase.from("student").select("email").in("email", emails)
      : { data: [] };
  const existingSet = new Set((existing ?? []).map((e) => e.email));

  const toInsert = validRows
    .filter((r) => !r.email || !existingSet.has(r.email))
    .map((r) => ({
      first_name: r.firstName,
      last_name: r.lastName,
      email: r.email,
      student_number: r.studentNumber,
      scholar_group: r.scholarGroup,
    }));

  if (toInsert.length === 0) return { error: "Tous les e-mails existent déjà." };

  const { error } = await supabase.from("student").insert(toInsert);
  if (error) return { error: "Import impossible. Réessayez." };

  revalidatePath("/students");
  return { created: toInsert.length };
}
