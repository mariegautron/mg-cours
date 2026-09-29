import { z } from "zod";

export const projectSchema = z.object({
  title: z.string().trim().min(1, "Le titre du projet est obligatoire.").max(200),
  briefMd: z.string().max(20000, "Le brief dépasse 20 000 caractères."),
  clientContextMd: z.string().max(20000, "Le contexte client dépasse 20 000 caractères."),
});

export function readProjectForm(formData: FormData) {
  return projectSchema.safeParse({
    title: formData.get("title") ?? "",
    briefMd: String(formData.get("briefMd") ?? "").trim(),
    clientContextMd: String(formData.get("clientContextMd") ?? "").trim(),
  });
}

const skeletonItemSchema = z.object({
  role: z.enum(["milestone", "oral", "individual"]),
  title: z.string().trim().min(1, "Chaque évaluation a un titre.").max(200),
  isGroupGrade: z.boolean(),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.")
    .nullable()
    .or(z.literal("").transform(() => null))
    .default(null),
});

export const skeletonSchema = z.array(skeletonItemSchema).min(1, "Rien à créer.").max(20);

export type SkeletonInput = z.infer<typeof skeletonSchema>;

/** Lit le JSON sérialisé par l'éditeur de squelette. */
export function readSkeletonJson(raw: string) {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { success: false as const, error: "Squelette illisible." };
  }
  const parsed = skeletonSchema.safeParse(json);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Squelette invalide.",
    };
  }
  return { success: true as const, items: parsed.data };
}

const themeSchema = z.object({
  id: z.string().uuid().nullable().default(null),
  title: z.string().trim().min(1, "Chaque thème a un titre.").max(200),
  descriptionMd: z.string().max(20000, "Description trop longue.").default(""),
});

export const themesSchema = z.array(themeSchema).max(12, "12 thèmes au plus.");

/** Lit le JSON sérialisé par l'éditeur de thèmes. */
export function readThemesJson(raw: string) {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { success: false as const, error: "Thèmes illisibles." };
  }
  const parsed = themesSchema.safeParse(json);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Thèmes invalides.",
    };
  }
  return { success: true as const, themes: parsed.data };
}
