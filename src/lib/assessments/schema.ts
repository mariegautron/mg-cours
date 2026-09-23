import { z } from "zod";

export interface ParsedCriterion {
  label: string;
  weight: number;
  lineNumber: number;
  error?: string;
}

/**
 * Un critère par ligne, format « Libellé | points » (ex. « Présentation | 4 »).
 * Pas d'éditeur de liste dynamique en V1 — texte libre, parsé et validé côté serveur.
 */
export function parseCriteriaLines(raw: string): ParsedCriterion[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line, i) => {
      const [labelPart, weightPart] = line.split("|").map((p) => p.trim());
      const weight = Number(weightPart);
      if (!labelPart) return { label: "", weight: 0, lineNumber: i + 1, error: "libellé manquant" };
      if (!weightPart || Number.isNaN(weight) || weight <= 0) {
        return { label: labelPart, weight: 0, lineNumber: i + 1, error: "points invalides" };
      }
      return { label: labelPart, weight, lineNumber: i + 1 };
    });
}

export const gridSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire.").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  criteriaText: z.string().trim().min(1, "Ajoutez au moins un critère."),
});

export function readGridForm(formData: FormData) {
  return gridSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    criteriaText: formData.get("criteriaText") ?? "",
  });
}

const COMMENT_CATEGORIES = ["positive", "negative", "advice"] as const;

export const commentSchema = z.object({
  text: z.string().trim().min(1, "Le texte est obligatoire.").max(1000),
  category: z.enum(COMMENT_CATEGORIES).default("advice"),
  tags: z.array(z.string().min(1)).max(20).default([]),
});

function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );
}

export function readCommentForm(formData: FormData) {
  return commentSchema.safeParse({
    text: formData.get("text") ?? "",
    category: formData.get("category") ?? "advice",
    tags: parseTags(String(formData.get("tags") ?? "")),
  });
}

const optionalDate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

const optionalMinutes = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? Number(v) : null))
  .pipe(z.number().int().min(0).max(1440).nullable());

export const assessmentSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire.").max(200),
  subject: z.string().trim().max(200).optional().or(z.literal("")),
  type: z.string().trim().max(100).optional().or(z.literal("")),
  coefficient: z.coerce.number().min(0.1).max(100).default(1),
  date: optionalDate,
  durationMinutes: optionalMinutes,
  studentGroupId: z.string().uuid("Choisissez un groupe."),
  gradingGridId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  isGroupGrade: z.coerce.boolean().default(false),
});

export function readAssessmentForm(formData: FormData) {
  return assessmentSchema.safeParse({
    title: formData.get("title") ?? "",
    subject: formData.get("subject") ?? "",
    type: formData.get("type") ?? "",
    coefficient: formData.get("coefficient") ?? "1",
    date: formData.get("date") ?? "",
    durationMinutes: formData.get("durationMinutes") ?? "",
    studentGroupId: formData.get("studentGroupId") ?? "",
    gradingGridId: formData.get("gradingGridId") ?? "",
    isGroupGrade: formData.get("isGroupGrade") === "on",
  });
}
