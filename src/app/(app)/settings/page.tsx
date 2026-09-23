import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";

import { DeleteSchoolButton } from "@/components/settings/delete-school-button";
import { ProfileForm } from "@/components/settings/profile-form";
import { Button } from "@/components/ui/button";
import { getProfile, listAllSchools } from "@/lib/settings/queries";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage() {
  const [profile, schools] = await Promise.all([getProfile(), listAllSchools()]);

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Réglages</h1>
        <p className="text-muted-foreground">
          Ces informations alimentent la trame pédagogique et les factures.
        </p>
      </div>

      <section aria-labelledby="profile">
        <h2 id="profile" className="mb-4 text-lg font-medium">
          Mon profil de prestataire
        </h2>
        <ProfileForm profile={profile} />
      </section>

      <section aria-labelledby="schools">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="schools" className="text-lg font-medium">
            Écoles
          </h2>
          <Button asChild size="sm" variant="secondary">
            <Link href="/settings/schools/new">
              <Plus aria-hidden />
              Ajouter une école
            </Link>
          </Button>
        </div>
        {schools.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune école pour l’instant.</p>
        ) : (
          <ul className="space-y-2">
            {schools.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-2 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {[s.siret, s.billing_email].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button asChild variant="ghost" size="icon">
                    <Link href={`/settings/schools/${s.id}/edit`} aria-label={`Modifier ${s.name}`}>
                      <Pencil aria-hidden />
                    </Link>
                  </Button>
                  <DeleteSchoolButton id={s.id} name={s.name} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
