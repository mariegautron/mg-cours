"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** Bandeau « hors connexion » : dit ce qui se passe et ce qui reste possible. Invisible en ligne. */
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div
      role="status"
      className="border-warning/60 bg-warning/15 mx-4 mt-3 rounded-xl border px-4 py-3 sm:mx-6"
    >
      <strong>Tu n’es pas connectée.</strong>
      <p className="text-muted-foreground text-sm">
        Tu peux lire ce qui est ouvert. Les changements ne partiront qu’au retour du réseau : ne
        ferme pas la page.
      </p>
    </div>
  );
}
