import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";

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
import { listScholarGroups, listStudents } from "@/lib/students/queries";

export const metadata: Metadata = { title: "Étudiants" };

export default async function StudentsPage({ searchParams }: PageProps<"/students">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const scholarGroup = typeof sp.scholarGroup === "string" ? sp.scholarGroup : "";
  const moduleId = typeof sp.moduleId === "string" ? sp.moduleId : "";

  const [students, scholarGroups, modules] = await Promise.all([
    listStudents({ q, scholarGroup, moduleId }),
    listScholarGroups(),
    listModules(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Étudiants</h1>
          <p className="text-muted-foreground">{students.length} étudiant·e·s.</p>
        </div>
        <div className="flex gap-2">
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
              Ajoutez-les un·e par un·e ou importez une liste CSV/XLSX.
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
                <h2 className="font-medium">
                  {s.first_name} {s.last_name}
                </h2>
                {s.email ? <p className="text-muted-foreground text-sm">{s.email}</p> : null}
                {s.scholar_group ? (
                  <Badge variant="secondary" className="mt-2">
                    {s.scholar_group}
                  </Badge>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
