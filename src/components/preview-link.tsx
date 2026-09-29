"use client";

import type { ComponentProps, MouseEvent } from "react";

const WAITING_PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Préparation de l’aperçu…</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif"><p role="status" style="font-size:1.125rem">Préparation de l’aperçu…</p></body></html>`;

/**
 * Lien d'aperçu qui s'ouvre dans un nouvel onglet. Le PDF est parfois généré à la demande : au
 * lieu d'un onglet blanc, l'onglet s'ouvre tout de suite sur « Préparation de l'aperçu… » puis
 * charge le fichier. Sans JavaScript, ou avec Ctrl/⌘/Maj + clic, le lien reste un lien ordinaire.
 */
export function PreviewLink({ href, onClick, ...props }: ComponentProps<"a"> & { href: string }) {
  function open(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    const tab = window.open("", "_blank");
    if (!tab) return; // fenêtres bloquées : le lien s'ouvre normalement
    event.preventDefault();
    tab.document.write(WAITING_PAGE);
    tab.document.close();
    tab.opener = null;
    tab.location.href = href;
  }

  return <a {...props} href={href} target="_blank" rel="noopener noreferrer" onClick={open} />;
}
