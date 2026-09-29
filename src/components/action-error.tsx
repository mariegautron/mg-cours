import Link from "next/link";

import { actionLink } from "@/lib/messages";
import { cn } from "@/lib/utils";

/**
 * Erreur d'une action (`role="alert"`) : le message, et une issue (lien) quand il en appelle une,
 * par exemple « Te reconnecter » quand la session a expiré.
 */
export function ActionError({ error, className }: { error: string; className?: string }) {
  const link = actionLink(error);
  return (
    <p role="alert" className={cn("text-destructive text-sm", className)}>
      {error}
      {link ? (
        <>
          {" "}
          <Link
            href={link.href}
            className="underline underline-offset-2"
            {...(link.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {link.label}
          </Link>
        </>
      ) : null}
    </p>
  );
}
