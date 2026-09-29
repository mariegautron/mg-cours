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
