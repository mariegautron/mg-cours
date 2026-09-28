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
    .guid()
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
  slidesUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (v) => v === "" || /^https?:\/\/\S+$/.test(v),
      "Le lien doit commencer par http:// ou https://.",
    )
    .optional(),
  /** Présentation du module aux étudiant·es (Markdown), projetée en ouverture. */
  studentIntro: z.string().max(20_000).optional().or(z.literal("")),
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
    slidesUrl: formData.get("slidesUrl") ?? "",
    studentIntro: formData.get("studentIntro") ?? "",
  });
}

const COURSE_TYPES = ["lecture", "workshop", "project", "assessment", "demo", "applied"] as const;

/** Statut de préparation d'une séance (`course.prep_status`). */
export const PREP_STATUSES = ["todo", "in_progress", "ready"] as const;
export type PrepStatus = (typeof PREP_STATUSES)[number];

/** Heure `HH:MM` (les secondes de Postgres sont retirées), facultative. */
const optionalTime = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v.replace(/^(\d{1,2}:\d{2}):\d{2}$/, "$1") : null))
  .pipe(
    z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format invalide : HH:MM attendu.")
      .nullable(),
  );

export const PREP_STATUS_LABELS: Record<PrepStatus, string> = {
  todo: "À préparer",
  in_progress: "En préparation",
  ready: "Prête",
};

export const courseSchema = z
  .object({
    title: z.string().trim().min(1, "Le titre est obligatoire.").max(200),
    type: z.enum(COURSE_TYPES).default("lecture"),
    position: z.coerce.number().int().min(0).max(1000).default(0),
    sessionDate: optionalDate,
    startTime: optionalTime,
    endTime: optionalTime,
    prepStatus: z.enum(PREP_STATUSES).default("todo"),
    learningObjectives: z.array(z.string().min(1)).max(30).default([]),
    animationNotes: z.string().trim().max(4000).optional().or(z.literal("")),
    assessmentNotes: z.string().trim().max(4000).optional().or(z.literal("")),
    material: z.string().trim().max(2000).optional().or(z.literal("")),
    resourceIds: z.array(z.string().uuid()).max(50).default([]),
  })
  .refine((c) => !c.startTime || !c.endTime || c.endTime > c.startTime, {
    message: "La fin doit être après le début.",
    path: ["endTime"],
  })
  .refine((c) => !c.endTime || c.startTime, {
    message: "Renseignez aussi l’heure de début.",
    path: ["startTime"],
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
    startTime: formData.get("startTime") ?? "",
    endTime: formData.get("endTime") ?? "",
    prepStatus: formData.get("prepStatus") ?? "todo",
    learningObjectives: parseLines(String(formData.get("learningObjectives") ?? "")),
    animationNotes: formData.get("animationNotes") ?? "",
    assessmentNotes: formData.get("assessmentNotes") ?? "",
    material: formData.get("material") ?? "",
    resourceIds: formData.getAll("resourceIds").map(String),
  });
}
