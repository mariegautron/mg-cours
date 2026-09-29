import { Mascot } from "@/components/mascot";

/** Présentation : jamais d'écran vide devant la classe, on dit ce qui se prépare. */
export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <Mascot mood="thinking" className="size-24" />
      <p role="status" className="text-lg font-medium">
        Préparation de la présentation…
      </p>
    </div>
  );
}
