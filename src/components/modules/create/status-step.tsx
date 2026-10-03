import { Check, Loader2, TriangleAlert } from "lucide-react";

/** Ligne d'avancement de la maquette « Import » : fait, en cours ou à venir, toujours écrite. */
export function StatusStep({
  state,
  title,
  detail,
}: {
  state: "done" | "running" | "todo";
  title: string;
  detail?: string;
}) {
  return (
    <li className="flex min-h-12 items-center gap-3 border-t py-2">
      <span
        aria-hidden
        className={`flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
          state === "done" ? "bg-mint text-background" : "bg-foreground/20"
        }`}
      >
        {state === "done" ? (
          <Check className="size-3.5" strokeWidth={3} />
        ) : state === "running" ? (
          <Loader2 className="size-4 motion-safe:animate-spin" />
        ) : (
          "·"
        )}
      </span>
      <div className="min-w-0 flex-1">
        <strong className="text-sm">{title}</strong>
        <span className="sr-only">
          {state === "done" ? " : fait" : state === "running" ? " : en cours" : " : à venir"}
        </span>
        {detail ? <div className="text-muted-foreground text-[0.8rem]">{detail}</div> : null}
      </div>
    </li>
  );
}

/** Message d'erreur encadré avec une issue : la maquette « Si quelque chose ne va pas ». */
export function ErrorBox({
  title,
  children,
  tone = "coral",
}: {
  title: string;
  children?: React.ReactNode;
  tone?: "coral" | "sun";
}) {
  return (
    <div
      role="alert"
      className={`flex gap-2.5 rounded-xl border p-3 ${tone === "sun" ? "border-sun" : "border-coral"}`}
    >
      <TriangleAlert
        aria-hidden
        className={`size-5 shrink-0 ${tone === "sun" ? "text-sun" : "text-coral"}`}
      />
      <div className="min-w-0 text-sm">
        <strong>{title}</strong>
        {children ? <div className="text-muted-foreground mt-0.5">{children}</div> : null}
      </div>
    </div>
  );
}
