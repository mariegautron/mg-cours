"use client";

import { useTransition } from "react";
import Link from "next/link";
import { UserMinus, UserPlus } from "lucide-react";

import { addMember, removeMember } from "@/app/(app)/modules/[id]/groups/actions";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/db";

export function GroupMembers({
  moduleId,
  groupId,
  members,
  candidates,
}: {
  moduleId: string;
  groupId: string;
  members: Tables<"student">[];
  candidates: Tables<"student">[];
}) {
  const [pending, startTransition] = useTransition();
  const memberIds = new Set(members.map((m) => m.id));
  const available = candidates.filter((c) => !memberIds.has(c.id));

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <h3 className="mb-2 text-sm font-medium">Membres ({members.length})</h3>
        {members.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucun membre pour l’instant.</p>
        ) : (
          <ul className="space-y-1">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
              >
                <Link href={`/students/${m.id}`} className="underline underline-offset-2">
                  {m.first_name} {m.last_name}
                </Link>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={pending}
                  aria-label={`Retirer ${m.first_name} ${m.last_name} du groupe`}
                  onClick={() => startTransition(() => void removeMember(moduleId, groupId, m.id))}
                >
                  <UserMinus aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium">Ajouter</h3>
        {available.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Tou·te·s les étudiant·es sont déjà dans ce groupe, ou{" "}
            <Link href="/students/new" className="underline underline-offset-2">
              créez-en un·e
            </Link>
            .
          </p>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2">
            {available.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {c.first_name} {c.last_name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={pending}
                  aria-label={`Ajouter ${c.first_name} ${c.last_name} au groupe`}
                  onClick={() => startTransition(() => void addMember(moduleId, groupId, c.id))}
                >
                  <UserPlus aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
