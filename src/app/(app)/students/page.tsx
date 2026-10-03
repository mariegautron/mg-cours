import type { Metadata } from "next";
import Link from "next/link";
import { Camera, Plus, Upload } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { StudentPhoto } from "@/components/students/student-photo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listModules } from "@/lib/modules/queries";
import { readView } from "@/lib/students/indicators";
import { loadStudentIndicators } from "@/lib/students/indicators-queries";
import { plural } from "@/lib/plural";
import { schoolYearLabel } from "@/lib/students/groups";
import { listScholarGroups, listStudentYears, listStudents } from "@/lib/students/queries";
import { promotionToShow } from "@/lib/students/years";

export const metadata: Metadata = { title: "Étudiant·es" };

function IndicatorBadges({ items }: { items: { key: string; label: string }[] }) {
  if (items.length === 0) return null;
  return (
    <span className="mt-2 flex flex-wrap gap-1">
      {items.map((i) => (
        <Badge key={i.key} variant={i.key === "appreciation_written" ? "outline" : "secondary"}>
          {i.label}
        </Badge>
      ))}
    </span>
  );
}

export default async function StudentsPage({ searchParams }: PageProps<"/students">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const scholarGroup = typeof sp.scholarGroup === "string" ? sp.scholarGroup : "";
  const moduleId = typeof sp.moduleId === "string" ? sp.moduleId : "";
  const yearParam = typeof sp.year === "string" && sp.year !== "" ? Number(sp.year) : NaN;
  const year = Number.isInteger(yearParam) ? yearParam : undefined;

  const view = readView(sp.view);
  const [students, scholarGroups, modules, years, indicators] = await Promise.all([
    listStudents({ q, scholarGroup, moduleId, year }),
    listScholarGroups(year),
    listModules(),
    listStudentYears(),
    loadStudentIndicators().catch(() => new Map()),
  ]);
  const viewHref = (v: string) => {
    const params = new URLSearchParams();
    for (const [k, val] of Object.entries(sp))
      if (k !== "view" && typeof val === "string" && val) params.set(k, val);
    if (v !== "tiles") params.set("view", v);
    const qs = params.toString();
    return qs ? `/students?${qs}` : "/students";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Étudiant·es</h1>
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

      <nav aria-label="Affichage de la liste" className="flex gap-2">
        {(
          [
            ["tiles", "Tuiles"],
            ["list", "Liste"],
          ] as const
        ).map(([v, label]) => (
          <Link
            key={v}
            href={viewHref(v)}
            aria-current={view === v ? "page" : undefined}
            className={`focus-visible:ring-ring inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none ${view === v ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {students.length === 0 ? (
        <EmptyState
          title="Personne pour l’instant"
          description="Importe la liste de la promotion, puis le trombinoscope pour avoir les photos. Tu peux aussi ajouter une personne à la main."
          actions={[
            { label: "Importer une liste", href: "/students/import" },
            { label: "Importer le trombinoscope", href: "/students/photos" },
          ]}
        />
      ) : view === "list" ? (
        <ul className="divide-y rounded-lg border">
          {students.map((s) => {
            const promo = promotionToShow(s.years, year);
            return (
              <li key={s.id}>
                <Link
                  href={`/students/${s.id}`}
                  className="hover:bg-accent focus-visible:ring-ring flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <StudentPhoto student={s} size="sm" />
                  <span className="min-w-40 flex-1 font-medium">
                    {s.last_name} {s.first_name}
                  </span>
                  <span className="text-muted-foreground text-sm">{promo?.group ?? ""}</span>
                  <IndicatorBadges items={indicators.get(s.id) ?? []} />
                </Link>
              </li>
            );
          })}
        </ul>
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
                <IndicatorBadges items={indicators.get(s.id) ?? []} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
