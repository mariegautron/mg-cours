import { z } from "zod";

import { isValidSiret } from "@/lib/settings/bank";
import { isValidIban } from "@/lib/ynov/invoice";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

const siretField = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s/g, ""))
  .pipe(z.string().regex(/^(\d{14})?$/, "Le SIRET compte 14 chiffres."))
  .refine((v) => v === "" || isValidSiret(v), "Ce SIRET n’est pas valide (clé de contrôle).");

const phoneField = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || /^(?:\+33|0)[1-9](?:[\s.-]?\d{2}){4}$/.test(v),
    "Numéro de téléphone invalide (ex. 06 12 34 56 78).",
  );

export const profileSchema = z.object({
  legalName: z.string().trim().min(1, "Le nom est obligatoire.").max(200),
  address: optionalText(500),
  siret: siretField,
  vatNumber: optionalText(50),
  activityNumber: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^\d{2}\s?\d{2}\s?\d{5}\s?\d{2}$/.test(v),
      "Le NDA compte 11 chiffres (ex. 52 44 09999 44).",
    ),
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
  phone: phoneField,
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
  siret: siretField,
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
