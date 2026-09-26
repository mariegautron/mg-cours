import { z } from "zod";

const optionalDate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

/** Champ heures optionnel : chaîne vide → null, sinon nombre ≥ 0. */
const optionalHours = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? Number(v) : null))
  .pipe(z.number().min(0).max(1000).nullable());

/** Tarif horaire HT optionnel : chaîne vide → null, sinon nombre ≥ 0. */
const optionalRate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? Number(v) : null))
  .pipe(z.number().min(0).max(10000).nullable());

export const moduleSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire.").max(200),
  schoolId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  level: z.string().trim().max(200).optional().or(z.literal("")),
  year: z.coerce.number().int().min(2020).max(2100),
  ycode: z.string().trim().max(50).optional().or(z.literal("")),
  totalHours: z.coerce.number().min(0).max(1000),
  hourlyRate: optionalRate,
  hoursLecture: optionalHours,
  hoursTd: optionalHours,
  hoursTp: optionalHours,
  startDate: optionalDate,
  firstSessionDate: optionalDate,
  endDate: optionalDate,
  purchaseOrderRef: z.string().trim().max(200).optional().or(z.literal("")),
});

export type ModuleInput = z.infer<typeof moduleSchema>;

export function readModuleForm(formData: FormData) {
  return moduleSchema.safeParse({
    name: formData.get("name") ?? "",
    schoolId: formData.get("schoolId") ?? "",
    level: formData.get("level") ?? "",
    year: formData.get("year") ?? "",
    ycode: formData.get("ycode") ?? "",
    totalHours: formData.get("totalHours") ?? "0",
    hourlyRate: formData.get("hourlyRate") ?? "",
    hoursLecture: formData.get("hoursLecture") ?? "",
    hoursTd: formData.get("hoursTd") ?? "",
    hoursTp: formData.get("hoursTp") ?? "",
    startDate: formData.get("startDate") ?? "",
    firstSessionDate: formData.get("firstSessionDate") ?? "",
    endDate: formData.get("endDate") ?? "",
    purchaseOrderRef: formData.get("purchaseOrderRef") ?? "",
  });
}

const COURSE_TYPES = ["lecture", "workshop", "project", "assessment", "demo", "applied"] as const;

export const courseSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire.").max(200),
  type: z.enum(COURSE_TYPES).default("lecture"),
  position: z.coerce.number().int().min(0).max(1000).default(0),
  sessionDate: optionalDate,
  learningObjectives: z.array(z.string().min(1)).max(30).default([]),
  animationNotes: z.string().trim().max(4000).optional().or(z.literal("")),
  assessmentNotes: z.string().trim().max(4000).optional().or(z.literal("")),
  material: z.string().trim().max(2000).optional().or(z.literal("")),
  resourceIds: z.array(z.string().uuid()).max(50).default([]),
});

export type CourseInput = z.infer<typeof courseSchema>;

/** Une ligne par objectif (textarea), lignes vides ignorées. */
function parseLines(raw: string): string[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function readCourseForm(formData: FormData) {
  return courseSchema.safeParse({
    title: formData.get("title") ?? "",
    type: formData.get("type") ?? "lecture",
    position: formData.get("position") ?? "0",
    sessionDate: formData.get("sessionDate") ?? "",
    learningObjectives: parseLines(String(formData.get("learningObjectives") ?? "")),
    animationNotes: formData.get("animationNotes") ?? "",
    assessmentNotes: formData.get("assessmentNotes") ?? "",
    material: formData.get("material") ?? "",
    resourceIds: formData.getAll("resourceIds").map(String),
  });
}
