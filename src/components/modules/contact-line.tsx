import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Adresse de contact affichée aux étudiant·es : l'e-mail de la fiche « Mon identité » (Réglages).
 * Rien n'est affiché sans adresse renseignée.
 */
async function contactEmail(): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("teacher_profile")
      .select("email")
      .not("email", "is", null)
      .order("created_at")
      .limit(1);
    const email = data?.[0]?.email?.trim();
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  } catch {
    return null;
  }
}

export async function ContactLine({
  tone,
  className,
}: {
  /** « tu » pour l'espace personnel, « vous » pour le lien de la classe. */
  tone: "tu" | "vous";
  className?: string;
}) {
  const email = await contactEmail();
  if (!email) return null;
  return (
    <p className={className}>
      Une question ? {tone === "tu" ? "Écris" : "Écrivez"} à Marie :{" "}
      <a href={`mailto:${email}`} className="underline underline-offset-2">
        {email}
      </a>
    </p>
  );
}
