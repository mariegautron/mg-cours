import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

const optionalRate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? Number(v) : null))
  .pipe(z.number().min(0).max(10000).nullable());

export const profileSchema = z.object({
  legalName: z.string().trim().min(1, "Le nom est obligatoire.").max(200),
  address: optionalText(500),
  siret: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^(\d{14})?$/, "Le SIRET compte 14 chiffres.")),
  vatNumber: optionalText(50),
  vatExempt: z.boolean(),
  hourlyRate: optionalRate,
  bankDetails: optionalText(500),
  email: z.string().trim().email("E-mail invalide.").optional().or(z.literal("")),
  phone: optionalText(50),
});

export function readProfileForm(formData: FormData) {
  return profileSchema.safeParse({
    legalName: formData.get("legalName") ?? "",
    address: formData.get("address") ?? "",
    siret: formData.get("siret") ?? "",
    vatNumber: formData.get("vatNumber") ?? "",
    vatExempt: formData.get("vatExempt") === "on",
    hourlyRate: formData.get("hourlyRate") ?? "",
    bankDetails: formData.get("bankDetails") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
  });
}

export const schoolSchema = z.object({
  name: z.string().trim().min(1, "Le nom est obligatoire.").max(200),
  siret: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^(\d{14})?$/, "Le SIRET compte 14 chiffres.")),
  address: optionalText(500),
  billingEmail: z.string().trim().email("E-mail invalide.").optional().or(z.literal("")),
  paIdentifier: optionalText(100),
});

export function readSchoolForm(formData: FormData) {
  return schoolSchema.safeParse({
    name: formData.get("name") ?? "",
    siret: formData.get("siret") ?? "",
    address: formData.get("address") ?? "",
    billingEmail: formData.get("billingEmail") ?? "",
    paIdentifier: formData.get("paIdentifier") ?? "",
  });
}
