"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

/**
 * Lien de retour qui ramène d'où l'on vient (page précédente de l'historique) ; sans historique
 * (page ouverte directement), il suit `href`.
 */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <Button asChild variant="ghost" size="touch">
      <Link
        href={href}
        onClick={(e) => {
          if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) {
            e.preventDefault();
            router.back();
          }
        }}
      >
        {children}
      </Link>
    </Button>
  );
}
