import { z } from "zod";

/** Transforme "a, b ,c" → ["a","b","c"] (sans doublons ni vides). */
export function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );
}

export const resourceSchema = z.object({
  title: z.string().trim().min(1, "Le titre est obligatoire.").max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  content: z.string().max(100_000).optional().or(z.literal("")),
  url: z.string().trim().url("URL invalide.").optional().or(z.literal("")),
  category: z.string().trim().max(100).optional().or(z.literal("")),
  tags: z.array(z.string().min(1)).max(50).default([]),
});

export type ResourceInput = z.infer<typeof resourceSchema>;

/** Lit un FormData et renvoie soit les données validées, soit les erreurs par champ. */
export function readResourceForm(formData: FormData) {
  return resourceSchema.safeParse({
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    content: formData.get("content") ?? "",
    url: formData.get("url") ?? "",
    category: formData.get("category") ?? "",
    tags: parseTags(String(formData.get("tags") ?? "")),
  });
}
