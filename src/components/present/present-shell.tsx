"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  ListTree,
  Minus,
  MonitorUp,
  Plus,
  Presentation,
  ScrollText,
  X,
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { clampIndex, parseSyncMessage } from "@/lib/present/sync";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PresentSlide {
  /** Index de la section (sommaire) à laquelle appartient la diapo. */
  section: number;
  /** Titre court, annoncé aux lecteurs d'écran et affiché dans le sommaire. */
  label: string | null;
  node: ReactNode;
}

type Mode = "document" | "slides";

const STORAGE_MODE = "mg-present-mode";
const STORAGE_SCALE = "mg-present-scale";
const SCALES = [0.8, 0.9, 1, 1.15, 1.3, 1.5] as const;

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Stockage indisponible (navigation privée) : le réglage vaut pour la page seulement.
  }
}

/** Ne pas détourner les touches pendant une saisie ou sur un contrôle qui les utilise. */
function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

/**
 * Coque du mode présentation : lecture continue (par défaut) ou diapositives, plein écran,
 * taille du texte, sommaire. Clavier : ← → Espace PageUp PageDown Début Fin, F (plein écran),
 * S (sommaire), D (document / diapositives), + / − (taille).
 */
export function PresentShell({
  title,
  backHref,
  backLabel,
  sections,
  slides,
  syncChannel,
  presenterHref,
}: {
  title: string;
  backHref: string;
  backLabel: string;
  sections: string[];
  slides: PresentSlide[];
  /** Canal de synchronisation avec la vue présentatrice (US-64), s'il y en a une. */
  syncChannel?: string;
  /** Lien de la vue présentatrice : ouverte dans une seconde fenêtre. */
  presenterHref?: string;
}) {
  const [mode, setMode] = useState<Mode>("document");
  const [scaleIndex, setScaleIndex] = useState(2);
  const [index, setIndex] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const indexRef = useRef(0);
  const total = slides.length;

  useEffect(() => {
    const storedMode = readStorage(STORAGE_MODE);
    const storedScale = Number(readStorage(STORAGE_SCALE));
    /* eslint-disable react-hooks/set-state-in-effect -- préférences locales lues après hydratation */
    if (storedMode === "slides" || storedMode === "document") setMode(storedMode);
    if (Number.isInteger(storedScale) && storedScale >= 0 && storedScale < SCALES.length) {
      setScaleIndex(storedScale);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Vue présentatrice (US-64) : la fenêtre projetée annonce sa diapositive et obéit aux « go ».
  useEffect(() => {
    if (!syncChannel || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(syncChannel);
    channelRef.current = channel;
    channel.onmessage = (event) => {
      const message = parseSyncMessage(event.data);
      if (!message) return;
      if (message.type === "go") {
        setMode("slides");
        setIndex(clampIndex(message.index, total));
      } else if (message.type === "hello") {
        channel.postMessage({ type: "state", index: indexRef.current, total });
      }
    };
    channel.postMessage({ type: "state", index: indexRef.current, total });
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [syncChannel, total]);

  useEffect(() => {
    indexRef.current = index;
    channelRef.current?.postMessage({ type: "state", index, total });
  }, [index, total]);

  const changeMode = useCallback((next: Mode) => {
    setMode(next);
    writeStorage(STORAGE_MODE, next);
  }, []);

  const changeScale = useCallback((delta: number) => {
    setScaleIndex((i) => {
      const next = Math.min(SCALES.length - 1, Math.max(0, i + delta));
      writeStorage(STORAGE_SCALE, String(next));
      return next;
    });
  }, []);

  const go = useCallback(
    (next: number) => setIndex(Math.min(total - 1, Math.max(0, next))),
    [total],
  );

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.();
  }, []);

  const jumpToSection = useCallback(
    (section: number) => {
      setTocOpen(false);
      if (mode === "slides") {
        go(slides.findIndex((s) => s.section === section));
      } else {
        document.getElementById(`section-${section}`)?.scrollIntoView();
      }
    },
    [go, mode, slides],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey || isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === "f") toggleFullscreen();
      else if (key === "s") setTocOpen((o) => !o);
      else if (key === "d") changeMode(mode === "slides" ? "document" : "slides");
      else if (key === "+" || key === "=") changeScale(1);
      else if (key === "-") changeScale(-1);
      else if (mode !== "slides") return;
      else if (["arrowright", "pagedown", " "].includes(key)) go(index + 1);
      else if (["arrowleft", "pageup"].includes(key)) go(index - 1);
      else if (key === "home") go(0);
      else if (key === "end") go(total - 1);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [changeMode, changeScale, go, index, mode, toggleFullscreen, total]);

  const current = slides[index];
  const scale = SCALES[scaleIndex];

  return (
    <div ref={rootRef} className="bg-background text-foreground flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
        <Button asChild variant="ghost" size="touch">
          <Link href={backHref}>
            <X aria-hidden />
            Quitter<span className="sr-only"> la présentation, retour à {backLabel}</span>
          </Link>
        </Button>
        <h1 className="text-muted-foreground min-w-0 flex-1 truncate text-sm font-medium">
          {title}
        </h1>
        <div role="group" aria-label="Affichage" className="flex gap-1">
          <Button
            type="button"
            size="touch"
            variant={mode === "document" ? "secondary" : "ghost"}
            aria-pressed={mode === "document"}
            onClick={() => changeMode("document")}
          >
            <ScrollText aria-hidden />
            Document
          </Button>
          <Button
            type="button"
            size="touch"
            variant={mode === "slides" ? "secondary" : "ghost"}
            aria-pressed={mode === "slides"}
            onClick={() => changeMode("slides")}
          >
            <Presentation aria-hidden />
            Diapositives
          </Button>
        </div>
        {sections.length > 1 ? (
          <Button
            type="button"
            size="touch"
            variant="ghost"
            aria-expanded={tocOpen}
            aria-controls="present-toc"
            onClick={() => setTocOpen((o) => !o)}
          >
            <ListTree aria-hidden />
            Sommaire
          </Button>
        ) : null}
        <div role="group" aria-label="Taille du texte" className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-touch"
            variant="ghost"
            aria-label="Réduire le texte"
            disabled={scaleIndex === 0}
            onClick={() => changeScale(-1)}
          >
            <Minus aria-hidden />
          </Button>
          <span className="w-12 text-center text-sm tabular-nums">{Math.round(scale * 100)} %</span>
          <Button
            type="button"
            size="icon-touch"
            variant="ghost"
            aria-label="Agrandir le texte"
            disabled={scaleIndex === SCALES.length - 1}
            onClick={() => changeScale(1)}
          >
            <Plus aria-hidden />
          </Button>
        </div>
        {presenterHref ? (
          <Button
            type="button"
            size="touch"
            variant="ghost"
            onClick={() =>
              window.open(presenterHref, "mg-presenter", "popup,width=1100,height=800")
            }
          >
            <MonitorUp aria-hidden />
            Vue présentatrice
            <span className="sr-only"> (nouvelle fenêtre)</span>
          </Button>
        ) : null}
        <ThemeToggle size="icon-touch" />
        <Button
          type="button"
          size="icon-touch"
          variant="ghost"
          aria-label="Plein écran (touche F)"
          onClick={toggleFullscreen}
        >
          <Expand aria-hidden />
        </Button>
      </header>

      {tocOpen ? (
        <nav
          id="present-toc"
          aria-label="Sommaire de la présentation"
          className="bg-card border-b px-4 py-3"
        >
          <ol className="flex flex-wrap gap-2">
            {sections.map((label, i) => (
              <li key={i}>
                <Button
                  type="button"
                  size="touch"
                  variant="outline"
                  onClick={() => jumpToSection(i)}
                >
                  {label}
                </Button>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <main className="flex-1 overflow-auto">
        {total === 0 ? (
          <p className="text-muted-foreground p-12 text-center text-2xl">Rien à présenter.</p>
        ) : mode === "document" ? (
          <div style={{ zoom: scale }} className="mx-auto max-w-5xl space-y-16 px-8 py-12">
            {slides.map((slide, i) => {
              const startsSection = i === 0 || slides[i - 1].section !== slide.section;
              return (
                <div
                  key={i}
                  id={startsSection ? `section-${slide.section}` : undefined}
                  className={cn("scroll-mt-4", startsSection && i > 0 && "border-t pt-16")}
                >
                  {slide.node}
                </div>
              );
            })}
          </div>
        ) : (
          <section
            key={index}
            aria-roledescription="diapositive"
            aria-label={`${index + 1} sur ${total}${current.label ? ` : ${current.label}` : ""}`}
            style={{ zoom: scale }}
            className="animate-pop-in mx-auto flex min-h-full max-w-6xl flex-col justify-center px-10 py-12"
          >
            {current.node}
          </section>
        )}
      </main>

      {mode === "slides" && total > 0 ? (
        <footer className="flex items-center gap-3 border-t px-4 py-2">
          <Button
            type="button"
            variant="ghost"
            size="touch-lg"
            disabled={index === 0}
            onClick={() => go(index - 1)}
          >
            <ChevronLeft aria-hidden />
            Précédente
          </Button>
          <div className="flex flex-1 items-center gap-3">
            <div aria-hidden className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-[width]"
                style={{ width: `${((index + 1) / total) * 100}%` }}
              />
            </div>
            <p aria-live="polite" className="text-muted-foreground text-sm tabular-nums">
              Diapositive {index + 1} sur {total}
              {current.label ? <span className="sr-only"> : {current.label}</span> : null}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="touch-lg"
            disabled={index === total - 1}
            onClick={() => go(index + 1)}
          >
            Suivante
            <ChevronRight aria-hidden />
          </Button>
        </footer>
      ) : null}
    </div>
  );
}
