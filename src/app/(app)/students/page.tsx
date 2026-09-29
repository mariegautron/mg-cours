import type { Metadata } from "next";
import Link from "next/link";
import { Camera, Plus, Upload } from "lucide-react";

import { StudentPhoto } from "@/components/students/student-photo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listModules } from "@/lib/modules/queries";
import { plural } from "@/lib/plural";
import { schoolYearLabel } from "@/lib/students/groups";
import { listScholarGroups, listStudentYears, listStudents } from "@/lib/students/queries";
import { promotionToShow } from "@/lib/students/years";

export const metadata: Metadata = { title: "Étudiants" };

export default async function StudentsPage({ searchParams }: PageProps<"/students">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const scholarGroup = typeof sp.scholarGroup === "string" ? sp.scholarGroup : "";
  const moduleId = typeof sp.moduleId === "string" ? sp.moduleId : "";
  const yearParam = typeof sp.year === "string" && sp.year !== "" ? Number(sp.year) : NaN;
  const year = Number.isInteger(yearParam) ? yearParam : undefined;

  const [students, scholarGroups, modules, years] = await Promise.all([
    listStudents({ q, scholarGroup, moduleId, year }),
    listScholarGroups(year),
    listModules(),
    listStudentYears(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Étudiants</h1>
          <p className="text-muted-foreground">
            {plural(students.length, "étudiant·e", "étudiant·es")}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/students/photos">
              <Camera aria-hidden />
              Importer les photos
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/students/import">
              <Upload aria-hidden />
              Importer
            </Link>
          </Button>
          <Button asChild>
            <Link href="/students/new">
              <Plus aria-hidden />
              Nouvel·le étudiant·e
            </Link>
          </Button>
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3" role="search">
        <div className="space-y-1">
          <Label htmlFor="q">Recherche</Label>
          <Input id="q" name="q" defaultValue={q} placeholder="Nom, prénom, e-mail…" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="year">Année scolaire</Label>
          <select
            id="year"
            name="year"
            defaultValue={year ?? ""}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">Toutes</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {schoolYearLabel(y)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="scholarGroup">Promotion</Label>
          <select
            id="scholarGroup"
            name="scholarGroup"
            defaultValue={scholarGroup}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">Toutes</option>
            {scholarGroups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="moduleId">Module</Label>
          <select
            id="moduleId"
            name="moduleId"
            defaultValue={moduleId}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">Tous</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.year})
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary">
          Filtrer
        </Button>
      </form>

      {students.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Aucun·e étudiant·e</EmptyTitle>
            <EmptyDescription>
              Ajoute-les un·e par un·e ou importe une liste CSV/XLSX.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/students/new">Nouvel·le étudiant·e</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((s) => (
            <li key={s.id}>
              <Link
                href={`/students/${s.id}`}
                className="hover:bg-accent focus-visible:ring-ring block h-full rounded-lg border p-4 focus-visible:ring-2 focus-visible:outline-none"
              >
                <div className="flex items-center gap-3">
                  <StudentPhoto student={s} size="md" />
                  <div>
                    <h2 className="font-medium">
                      {s.first_name} {s.last_name}
                    </h2>
                    {s.email ? <p className="text-muted-foreground text-sm">{s.email}</p> : null}
                  </div>
                </div>
                {(() => {
                  const promo = promotionToShow(s.years, year);
                  return promo ? (
                    <Badge variant="secondary" className="mt-2">
                      {promo.group}
                      {year === undefined ? ` · ${promo.label}` : ""}
                    </Badge>
                  ) : null;
                })()}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
