"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { readQuestionForm } from "@/lib/questions/form";
import { getQuestion, listQuestions, toQuestionInput } from "@/lib/questions/queries";
import { parseMoodleXml } from "@/lib/questions/moodle-xml";
import { insertQuestion, updateQuestion } from "@/lib/questions/save";
import { validateQuestion } from "@/lib/questions/validate";
import { createClient } from "@/lib/supabase/server";

export interface QuestionFormState {
  errors?: string[];
}

export async function saveQuestion(
  id: string | null,
  _prev: QuestionFormState,
  formData: FormData,
): Promise<QuestionFormState> {
  const read = readQuestionForm(formData);
  if ("error" in read) return { errors: [read.error] };
  const errors = validateQuestion(read.input);
  if (errors.length) return { errors };

  const supabase = await createClient();
  if (id) {
    const result = await updateQuestion(supabase, id, read.input);
    if (result.error)
      return { errors: [`On n’a pas pu enregistrer la question : ${result.error}.`] };
  } else {
    const result = await insertQuestion(supabase, read.input);
    if ("error" in result)
      return { errors: [`On n’a pas pu enregistrer la question : ${result.error}.`] };
    id = result.id;
  }
  revalidatePath("/questions");
  redirect(`/questions/${id}`);
}

export async function duplicateQuestion(id: string): Promise<void> {
  const source = await getQuestion(id);
  if (!source) redirect("/questions");
  const supabase = await createClient();
  const input = toQuestionInput(source);
  const copy = await insertQuestion(supabase, { ...input, name: `${input.name} (copie)` });
  if ("error" in copy) redirect(`/questions/${id}?error=${encodeURIComponent(copy.error)}`);
  revalidatePath("/questions");
  redirect(`/questions/${copy.id}/edit`);
}

export async function setQuestionArchived(id: string, archived: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("question")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  revalidatePath("/questions");
  revalidatePath(`/questions/${id}`);
  redirect(archived ? "/questions" : `/questions/${id}`);
}

export interface ImportState {
  errors?: string[];
  preview?: {
    total: number;
    fresh: number;
    duplicates: number;
    byCategory: { category: string; count: number }[];
    skipped: { name: string; reason: string }[];
  };
  imported?: number;
}

const MAX_XML_BYTES = 5 * 1024 * 1024;

/** Import Moodle XML en deux temps : « Vérifier » (aucune écriture) puis « Importer ». */
export async function importMoodleXml(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { errors: ["Choisis un fichier XML exporté de Moodle."] };
  if (file.size > MAX_XML_BYTES)
    return {
      errors: [
        `Ce fichier fait ${(file.size / 1024 / 1024).toFixed(1)} Mo : la limite est de 5 Mo.`,
      ],
    };
  const xml = await file.text();
  if (!/<quiz[\s>]/.test(xml))
    return {
      errors: ["Ce fichier n’est pas un export « Moodle XML » : la balise <quiz> est introuvable."],
    };

  const parsed = parseMoodleXml(xml);
  const valid = parsed.questions.filter((q) => validateQuestion(q).length === 0);
  const invalid = parsed.questions.filter((q) => validateQuestion(q).length > 0);
  const skipped = [
    ...parsed.skipped,
    ...invalid.map((q) => ({ name: q.name, reason: validateQuestion(q)[0] })),
  ];

  const existing = await listQuestions();
  const known = new Set(existing.map((q) => `${q.category}|${q.name}|${q.statement}`));
  const fresh = valid.filter((q) => !known.has(`${q.category}|${q.name}|${q.statement}`));

  const byCategory = new Map<string, number>();
  for (const q of fresh) byCategory.set(q.category, (byCategory.get(q.category) ?? 0) + 1);
  const preview = {
    total: parsed.questions.length + parsed.skipped.length,
    fresh: fresh.length,
    duplicates: valid.length - fresh.length,
    byCategory: [...byCategory].map(([category, count]) => ({ category, count })),
    skipped,
  };

  if (formData.get("mode") !== "import") return { preview };

  const supabase = await createClient();
  let imported = 0;
  const errors: string[] = [];
  for (const q of fresh) {
    const result = await insertQuestion(supabase, q);
    if ("error" in result) errors.push(`« ${q.name} » : ${result.error}.`);
    else imported += 1;
  }
  revalidatePath("/questions");
  return { preview, imported, errors: errors.length ? errors : undefined };
}
