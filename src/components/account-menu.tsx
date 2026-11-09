"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Settings } from "lucide-react";

import { signOut } from "@/app/(app)/settings/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** L'adresse en haut de chaque page : un menu « Réglages » / « Se déconnecter ». */
export function AccountMenu({ email, className }: { email: string; className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`text-muted-foreground hover:text-foreground focus-visible:ring-ring flex min-h-11 max-w-full min-w-0 items-center gap-1 rounded-md px-2 text-sm focus-visible:ring-2 focus-visible:outline-none ${className ?? ""}`}
      >
        <span className="truncate">{email}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0" />
        <span className="sr-only"> : menu du compte</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings aria-hidden />
            Réglages
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            void signOut();
          }}
        >
          <LogOut aria-hidden />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
