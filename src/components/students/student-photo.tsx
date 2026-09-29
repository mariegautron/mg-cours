import { initials } from "@/lib/students/photo";
import { cn } from "@/lib/utils";

const SIZES = { sm: "size-10 text-sm", md: "size-16 text-lg", lg: "size-32 text-3xl" } as const;

/**
 * US-66 : photo d'un·e étudiant·e. L'image passe par `/api/students/[id]/photo` (session requise,
 * lien signé de quelques secondes) ; le texte alternatif est le nom. Sans photo : initiales.
 */
export function StudentPhoto({
  student,
  size = "sm",
  className,
}: {
  student: { id: string; first_name: string; last_name: string; photo_path: string | null };
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const name = `${student.first_name} ${student.last_name}`;
  if (!student.photo_path) {
    return (
      <span
        aria-hidden
        className={cn(
          "bg-muted text-muted-foreground inline-flex shrink-0 items-center justify-center rounded-full font-medium",
          SIZES[size],
          className,
        )}
      >
        {initials(student.first_name, student.last_name)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- redirection vers un lien signé éphémère : next/image ne peut pas l'optimiser
    <img
      src={`/api/students/${student.id}/photo`}
      alt={name}
      loading="lazy"
      className={cn("shrink-0 rounded-full object-cover", SIZES[size], className)}
    />
  );
}
