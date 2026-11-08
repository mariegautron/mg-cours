"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";

/** Champ de recherche de la liste : filtre pendant la frappe (comme Ctrl K), sans accents. */
export function StudentSearchInput({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(defaultValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <Input
      id="q"
      name="q"
      type="search"
      value={value}
      autoComplete="off"
      placeholder="Nom, prénom, e-mail…"
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          const sp = new URLSearchParams(params.toString());
          if (next.trim()) sp.set("q", next);
          else sp.delete("q");
          const qs = sp.toString();
          router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        }, 150);
      }}
    />
  );
}
