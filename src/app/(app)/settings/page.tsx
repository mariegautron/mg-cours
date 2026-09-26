import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";

import { DeleteSchoolButton } from "@/components/settings/delete-school-button";
import { ProfileForm } from "@/components/settings/profile-form";
import { Button } from "@/components/ui/button";
import { formatSiret } from "@/lib/settings/bank";
import { getProfile, listAllSchools } from "@/lib/settings/queries";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage() {
  const [profile, schools] = await Promise.all([getProfile(), listAllSchools()]);

  return (
    <div className="max-w-5xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Réglages</h1>
        <p className="text-muted-foreground">
          Vos informations administratives et les écoles avec lesquelles vous travaillez.
        </p>
      </div>

      <section aria-labelledby="profile">
        <div className="mb-6">
          <h2 id="profile" className="text-lg font-medium">
            Profil du prestataire
          </h2>
          <p className="text-muted-foreground text-sm">
            Utilisé sur la trame pédagogique et les factures.
          </p>
        </div>
        <ProfileForm profile={profile} />
      </section>

      <section aria-labelledby="schools">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="schools" className="text-lg font-medium">
              Écoles
            </h2>
            <p className="text-muted-foreground text-sm">Les écoles que vous facturez.</p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/settings/schools/new">
              <Plus aria-hidden />
              Ajouter une école
            </Link>
          </Button>
        </div>
        {schools.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucune école pour l’instant.</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {schools.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-4"
              >
                <div className="space-y-0.5">
                  <p className="font-medium">{s.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {s.siret ? `SIRET ${formatSiret(s.siret)}` : "SIRET non renseigné"}
                  </p>
                  {s.billing_email ? (
                    <p className="text-muted-foreground text-sm">{s.billing_email}</p>
                  ) : null}
                </div>
                <div className="flex gap-1">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/settings/schools/${s.id}/edit`} aria-label={`Modifier ${s.name}`}>
                      <Pencil aria-hidden />
                      Modifier
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
