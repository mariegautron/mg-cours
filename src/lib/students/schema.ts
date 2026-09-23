import { z } from "zod";

export const studentSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est obligatoire.").max(100),
  lastName: z.string().trim().min(1, "Le nom est obligatoire.").max(100),
  email: z.string().trim().toLowerCase().email("E-mail invalide.").optional().or(z.literal("")),
  studentNumber: z.string().trim().max(50).optional().or(z.literal("")),
  scholarGroup: z.string().trim().max(100).optional().or(z.literal("")),
  personalNotes: z.string().trim().max(4000).optional().or(z.literal("")),
});

export type StudentInput = z.infer<typeof studentSchema>;

export function readStudentForm(formData: FormData) {
  return studentSchema.safeParse({
    firstName: formData.get("firstName") ?? "",
    lastName: formData.get("lastName") ?? "",
    email: formData.get("email") ?? "",
    studentNumber: formData.get("studentNumber") ?? "",
    scholarGroup: formData.get("scholarGroup") ?? "",
    personalNotes: formData.get("personalNotes") ?? "",
  });
}

export const groupSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire.").max(200),
  type: z.enum(["tp", "td", "project"]).default("project"),
});

export function readGroupForm(formData: FormData) {
  return groupSchema.safeParse({
    name: formData.get("name") ?? "",
    type: formData.get("type") ?? "project",
  });
}
