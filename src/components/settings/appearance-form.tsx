"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { useTheme } from "next-themes";

import { saveDensity, saveTextSize } from "@/app/(app)/settings/actions";
import { DENSITIES, DENSITY_LABELS, type Density } from "@/lib/settings/density";
import { TEXT_SIZE_LABELS, TEXT_SIZES, type TextSize } from "@/lib/settings/text-size";
import { cn } from "@/lib/utils";

const THEMES = [
  { value: "system", label: "Comme mon système" },
  { value: "light", label: "Clair" },
  { value: "dark", label: "Sombre" },
] as const;

function Choice({
  name,
  value,
  label,
  checked,
  onChange,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        "has-focus-visible:ring-ring/50 flex min-h-11 cursor-pointer items-center rounded-xl border px-4 text-sm font-semibold has-focus-visible:ring-3",
        checked ? "bg-primary text-primary-foreground border-transparent" : "bg-muted/40",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {label}
    </label>
  );
}

/** Apparence : thème (système / clair / sombre), taille du texte et densité (compacte / confortable). Chaque choix s'applique tout de suite. */
export function AppearanceForm({ textSize, density }: { textSize: TextSize; density: Density }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [size, setSize] = useState<TextSize>(textSize);
  const [, startTransition] = useTransition();
  const [saved, setSaved] = useState("");
  const [dens, setDens] = useState<Density>(density);

  useEffect(() => {
    document.documentElement.dataset.textSize = size;
  }, [size]);
  useEffect(() => {
    document.documentElement.dataset.density = dens;
  }, [dens]);

  function pickDensity(next: Density) {
    setDens(next);
    startTransition(async () => {
      await saveDensity(next);
      setSaved(`Densité : ${DENSITY_LABELS[next].toLowerCase()}.`);
    });
  }

  function pickSize(next: TextSize) {
    setSize(next);
    startTransition(async () => {
      await saveTextSize(next);
      setSaved(`Taille du texte : ${TEXT_SIZE_LABELS[next].toLowerCase()}.`);
    });
  }

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Thème" className="flex flex-wrap gap-2">
        {THEMES.map((t) => (
          <Choice
            key={t.value}
            name="theme"
            value={t.value}
            label={t.label}
            checked={mounted && theme === t.value}
            onChange={() => {
              setTheme(t.value);
              setSaved(`Thème : ${t.label.toLowerCase()}.`);
            }}
          />
        ))}
      </div>
      <div role="radiogroup" aria-label="Taille du texte" className="flex flex-wrap gap-2">
        {TEXT_SIZES.map((s) => (
          <Choice
            key={s}
            name="text-size"
            value={s}
            label={TEXT_SIZE_LABELS[s]}
            checked={size === s}
            onChange={() => pickSize(s)}
          />
        ))}
      </div>
      <div role="radiogroup" aria-label="Densité de l’affichage" className="flex flex-wrap gap-2">
        {DENSITIES.map((d) => (
          <Choice
            key={d}
            name="density"
            value={d}
            label={DENSITY_LABELS[d]}
            checked={dens === d}
            onChange={() => pickDensity(d)}
          />
        ))}
      </div>
      <p role="status" className="text-muted-foreground text-sm">
        {saved}
      </p>
    </div>
  );
}
