import { z } from "zod";

import { PREP_STATUSES } from "@/lib/assessments/subject";

export const gridSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire.").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  // Sérialisé par l'éditeur de liste de critères (voir grid-form.tsx) ; validé plus précisément
  // par `readCriteriaInput` (src/lib/assessments/grid-criteria.ts) une fois le JSON parsé.
  criteriaJson: z.string().trim().min(1, "Ajoutez au moins un critère."),
  // Axes (US-82), même principe : validé par `readAxesInput`.
  axesJson: z.string().default(""),
  confirmDeleteCriteria: z.coerce.boolean().default(false),
});

export function readGridForm(formData: FormData) {
  return gridSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? "",
    criteriaJson: formData.get("criteriaJson") ?? "",
    axesJson: formData.get("axesJson") ?? "",
    confirmDeleteCriteria: formData.get("confirmDeleteCriteria") === "1",
  });
}

const COMMENT_CATEGORIES = ["positive", "negative", "advice"] as const;

export const commentSchema = z.object({
  text: z.string().trim().min(1, "Le texte est obligatoire.").max(1000),
  category: z.enum(COMMENT_CATEGORIES).default("advice"),
  tags: z.array(z.string().min(1)).max(20).default([]),
  subject: z
    .string()
    .trim()
    .max(100, "Matière trop longue (100 caractères max).")
    .default("")
    .transform((v) => v || null),
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
    subject: formData.get("subject") ?? "",
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

const optionalMaxScore = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? Number(v.replace(",", ".")) : null))
  .pipe(
    z
      .number({ message: "Barème invalide." })
      .positive("Le barème doit être supérieur à 0.")
      .max(1000, "Barème trop élevé.")
      .nullable(),
  );

export const assessmentSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire.").max(200),
  subject: z
    .string()
    .trim()
    .max(20000, "Le sujet dépasse 20 000 caractères.")
    .optional()
    .or(z.literal("")),
  type: z.string().trim().max(100).optional().or(z.literal("")),
  coefficient: z.coerce.number().min(0.1).max(100).default(1),
  date: optionalDate,
  durationMinutes: optionalMinutes,
  studentGroupIds: z
    .array(z.string().uuid("Groupe invalide."))
    .min(1, "Choisissez au moins un groupe.")
    .transform((ids) => Array.from(new Set(ids))),
  gradingGridId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  isGroupGrade: z.coerce.boolean().default(false),
  maxScore: optionalMaxScore,
  /** Sujet (US-90) : objectif, rendu attendu, ce qui sera évalué, séance et état de préparation. */
  objective: z
    .string()
    .trim()
    .max(2000, "L’objectif dépasse 2 000 caractères.")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  deliverableMd: z
    .string()
    .trim()
    .max(20000, "Le rendu attendu dépasse 20 000 caractères.")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  evaluatedMd: z
    .string()
    .trim()
    .max(20000, "« Ce qui sera évalué » dépasse 20 000 caractères.")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  courseId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  prepStatus: z.enum(PREP_STATUSES as [string, ...string[]]).default("to_build"),
  /** Critères de la grille validés d'office pour cette évaluation (US-82). */
  autoValidatedCriterionIds: z
    .array(z.string().uuid())
    .transform((ids) => Array.from(new Set(ids)))
    .default([]),
});

export function readAssessmentForm(formData: FormData) {
  return assessmentSchema.safeParse({
    title: formData.get("title") ?? "",
    subject: formData.get("subject") ?? "",
    type: formData.get("type") ?? "",
    coefficient: formData.get("coefficient") ?? "1",
    date: formData.get("date") ?? "",
    durationMinutes: formData.get("durationMinutes") ?? "",
    studentGroupIds: formData.getAll("studentGroupIds").map(String),
    gradingGridId: formData.get("gradingGridId") ?? "",
    isGroupGrade: formData.get("isGroupGrade") === "on",
    maxScore: formData.get("maxScore") ?? "",
    objective: formData.get("objective") ?? "",
    deliverableMd: formData.get("deliverableMd") ?? "",
    evaluatedMd: formData.get("evaluatedMd") ?? "",
    courseId: formData.get("courseId") ?? "",
    prepStatus: formData.get("prepStatus") ?? "to_build",
    autoValidatedCriterionIds: formData.getAll("autoValidatedCriterionIds").map(String),
  });
}
