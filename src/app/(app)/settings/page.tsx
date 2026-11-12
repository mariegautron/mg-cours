import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { Check, Pencil, Plus } from "lucide-react";

import { StudentContactForm } from "@/components/settings/student-contact-form";
import { getStudent } from "@/lib/students/queries";
import { SchoolRulesForm } from "@/components/settings/school-rules-form";
import { ExportButton } from "@/components/settings/export-button";
import { AccountSection } from "@/components/settings/account-section";
import { AppearanceForm } from "@/components/settings/appearance-form";
import { DENSITY_COOKIE, readDensity } from "@/lib/settings/density";
import { readTextSize, TEXT_SIZE_COOKIE } from "@/lib/settings/text-size";
import { readSchoolRules } from "@/lib/settings/school-rules";
import { DeleteSchoolButton } from "@/components/settings/delete-school-button";
import { ProfileForm } from "@/components/settings/profile-form";
import { Button } from "@/components/ui/button";
import { formatSiret } from "@/lib/settings/bank";
import { getProfile, listAllSchools, listSchoolRules } from "@/lib/settings/queries";

export const metadata: Metadata = { title: "Réglages" };

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const { saved, retour, regles } = await searchParams;
  // Retour proposé seulement vers une page d'appréciations du module (jamais une adresse libre).
  const backTo =
    typeof retour === "string" &&
    /^\/modules\/[0-9a-f-]{36}\/appreciations(\/[0-9a-f-]{36})?$/.test(retour)
      ? retour
      : null;
  // Retour vers l'appréciation d'une personne : « ← Revenir à l'appréciation de Prénom ».
  const backStudentId = backTo?.split("/")[4] ?? null;
  const backStudent = backStudentId ? await getStudent(backStudentId) : null;
  const [profile, schools, rules] = await Promise.all([
    getProfile(),
    listAllSchools(),
    listSchoolRules(),
  ]);

  const cookieStore = await cookies();
  const textSize = readTextSize(cookieStore.get(TEXT_SIZE_COOKIE)?.value);
  const density = readDensity(cookieStore.get(DENSITY_COOKIE)?.value);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        {backTo ? (
          <Link href={backTo} className="text-sm underline underline-offset-2">
            {backStudent
              ? `← Revenir à l’appréciation de ${backStudent.first_name}`
              : "← Revenir aux appréciations"}
          </Link>
        ) : null}
        <h1 className="text-2xl font-semibold">Réglages</h1>
        <p className="text-muted-foreground">
          Ce que tu règles une fois. Chaque changement s’enregistre et te le dit.
        </p>
      </div>

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-[3_1_0] space-y-10">
          <section aria-labelledby="appearance" className="space-y-2">
            <h2 id="appearance" className="text-lg font-medium">
              Apparence
            </h2>
            <p className="text-muted-foreground text-sm">
              Choisis l’affichage qui te repose les yeux. Chaque choix s’applique tout de suite.
            </p>
            <AppearanceForm textSize={textSize} density={density} />
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
            <div className="mt-6">
              <StudentContactForm value={profile?.student_contact_email ?? null} />
            </div>
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
              className={typeof saved === "string" ? "text-success mb-3 text-sm" : "sr-only"}
            >
              {typeof saved === "string" ? (
                <span className="inline-flex items-center gap-1">
                  <Check aria-hidden className="size-4" />
                  École « {saved} » enregistrée.
                  {typeof regles === "string" ? (
                    <>
                      {" "}
                      <a href={`#rules-${regles}`} className="underline underline-offset-2">
                        Étape suivante : ses règles de notation
                      </a>
                    </>
                  ) : null}
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
                        <Link
                          href={`/settings/schools/${s.id}/edit`}
                          aria-label={`Modifier ${s.name}`}
                        >
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
                Ce qui change d’une école à l’autre : règles de notation, absence excusée, adresses
                des étudiant·es, longueur des appréciations.
              </p>
            </div>
            {schools.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Ajoute d’abord une école pour régler ses règles.
              </p>
            ) : (
              <div className="grid gap-4 2xl:grid-cols-2">
                {schools.map((s) => (
                  <SchoolRulesForm
                    key={s.id}
                    schoolId={s.id}
                    schoolName={s.name}
                    rules={readSchoolRules(rules.bySchool.get(s.id) ?? null)}
                    available={rules.available}
                    isNew={regles === s.id}
                  />
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="appreciation-phrases" className="space-y-2">
            <h2 id="appreciation-phrases" className="text-lg font-medium">
              Mes formulations d’appréciation
            </h2>
            <p className="text-muted-foreground text-sm">
              Elles sont avec toutes tes phrases, dans la Bibliothèque.{" "}
              <Link
                href="/assessments/comments?type=appreciation"
                className="underline underline-offset-2"
              >
                Ouvrir les phrases d’appréciation
              </Link>
            </p>
          </section>
        </div>
        <div className="min-w-0 flex-[2_1_0] space-y-10">
          <section aria-labelledby="my-data" className="space-y-2">
            <h2 id="my-data" className="text-lg font-medium">
              Mes données
            </h2>
            <p className="text-muted-foreground text-sm">
              Tout ce que l’appli garde pour toi, fichiers compris, dans un .zip (tes observations
              restent dans l’appli). Il contient tes coordonnées bancaires et les données de tes
              étudiant·es : garde-le en lieu sûr.
            </p>
            <ExportButton />
          </section>

          <section aria-labelledby="account" className="space-y-2">
            <h2 id="account" className="text-lg font-medium">
              Compte
            </h2>
            <p className="text-muted-foreground text-sm">Connexion et sécurité.</p>
            <AccountSection />
          </section>
        </div>
      </div>
    </div>
  );
}
