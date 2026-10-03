import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Check, Pencil, Plus } from "lucide-react";

import { SchoolRulesForm } from "@/components/settings/school-rules-form";
import { AccountSection } from "@/components/settings/account-section";
import { AppearanceForm } from "@/components/settings/appearance-form";
import { readTextSize, TEXT_SIZE_COOKIE } from "@/lib/settings/text-size";
import { readSchoolRules } from "@/lib/settings/school-rules";
import { DeleteSchoolButton } from "@/components/settings/delete-school-button";
import { ProfileForm } from "@/components/settings/profile-form";
import { Button } from "@/components/ui/button";
import { formatSiret } from "@/lib/settings/bank";
import { getProfile, listAllSchools, listSchoolRules } from "@/lib/settings/queries";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const { saved } = await searchParams;
  const [profile, schools, rules] = await Promise.all([
    getProfile(),
    listAllSchools(),
    listSchoolRules(),
  ]);

  const textSize = readTextSize((await cookies()).get(TEXT_SIZE_COOKIE)?.value);

  return (
    <div className="max-w-5xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Réglages</h1>
        <p className="text-muted-foreground">
          Ce que tu règles une fois. Chaque changement s’enregistre et te le dit.
        </p>
      </div>

      <section aria-labelledby="appearance" className="space-y-2">
        <h2 id="appearance" className="text-lg font-medium">
          Apparence
        </h2>
        <p className="text-muted-foreground text-sm">
          Choisis l’affichage qui te repose les yeux. Chaque choix s’applique tout de suite.
        </p>
        <AppearanceForm textSize={textSize} />
      </section>

      <section aria-labelledby="profile">
        <div className="mb-6">
          <h2 id="profile" className="text-lg font-medium">
            Profil du prestataire
          </h2>
          <p className="text-muted-foreground text-sm">
            Utilisé sur la progression pédagogique et les factures.
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
            <p className="text-muted-foreground text-sm">Les écoles que tu factures.</p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/settings/schools/new">
              <Plus aria-hidden />
              Ajouter une école
            </Link>
          </Button>
        </div>
        <p
          role="status"
          className={
            typeof saved === "string"
              ? "mb-3 text-sm text-emerald-600 dark:text-emerald-400"
              : "sr-only"
          }
        >
          {typeof saved === "string" ? (
            <span className="inline-flex items-center gap-1">
              <Check aria-hidden className="size-4" />
              École « {saved} » enregistrée.
            </span>
          ) : null}
        </p>
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

      <section aria-labelledby="school-rules" className="space-y-4">
        <div>
          <h2 id="school-rules" className="text-lg font-medium">
            Règles par école
          </h2>
          <p className="text-muted-foreground text-sm">
            Ce qui change d’une école à l’autre : absence excusée, adresses des étudiant·es,
            longueur des appréciations.
          </p>
        </div>
        {schools.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Ajoute d’abord une école pour régler ses règles.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {schools.map((s) => (
              <SchoolRulesForm
                key={s.id}
                schoolId={s.id}
                schoolName={s.name}
                rules={readSchoolRules(rules.bySchool.get(s.id) ?? null)}
                available={rules.available}
              />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="my-data" className="space-y-2">
        <h2 id="my-data" className="text-lg font-medium">
          Mes données
        </h2>
        <p className="text-muted-foreground text-sm">
          Tout ce que l’appli garde pour toi : notes, ressources, modules, évaluations, factures (un
          fichier).
        </p>
        <Button asChild variant="outline" size="touch">
          <a href="/api/export" download>
            Exporter mes données
          </a>
        </Button>
      </section>

      <section aria-labelledby="account" className="space-y-2">
        <h2 id="account" className="text-lg font-medium">
          Compte
        </h2>
        <p className="text-muted-foreground text-sm">Connexion et sécurité.</p>
        <AccountSection />
      </section>
    </div>
  );
}
