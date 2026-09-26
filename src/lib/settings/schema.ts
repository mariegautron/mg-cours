import { z } from "zod";

import { isValidIban } from "@/lib/ynov/invoice";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const profileSchema = z.object({
  legalName: z.string().trim().min(1, "Le nom est obligatoire.").max(200),
  address: optionalText(500),
  siret: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^(\d{14})?$/, "Le SIRET compte 14 chiffres.")),
  vatNumber: optionalText(50),
  activityNumber: optionalText(50),
  vatExempt: z.boolean(),
  iban: z
    .string()
    .trim()
    .refine((v) => v === "" || isValidIban(v), "IBAN invalide."),
  bic: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, "").toUpperCase())
    .pipe(z.string().regex(/^([A-Z0-9]{8}|[A-Z0-9]{11})?$/, "Le BIC compte 8 ou 11 caractères.")),
  email: z.string().trim().email("E-mail invalide.").optional().or(z.literal("")),
  phone: optionalText(50),
});

export function readProfileForm(formData: FormData) {
  return profileSchema.safeParse({
    legalName: formData.get("legalName") ?? "",
    address: formData.get("address") ?? "",
    siret: formData.get("siret") ?? "",
    vatNumber: formData.get("vatNumber") ?? "",
    activityNumber: formData.get("activityNumber") ?? "",
    vatExempt: formData.get("vatExempt") === "on",
    iban: formData.get("iban") ?? "",
    bic: formData.get("bic") ?? "",
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
