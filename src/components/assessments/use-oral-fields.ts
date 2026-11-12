"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { saveOralField } from "@/app/(app)/modules/[id]/assessments/[assessmentId]/oral/space-actions";
import type { SaveFieldResult } from "@/lib/assessments/versioned-save-types";
import { frTime } from "@/lib/fr-time";

const AUTOSAVE_MS = 2000;
const RETRY_MS = 5000;

export interface FieldsInit {
  values: Record<string, string>;
  versions: Record<string, number>;
}

export type FieldSaver = (
  field: string,
  value: string,
  baseVersion: number,
  force: boolean,
) => Promise<SaveFieldResult>;

/** Espace d'oral : champ par champ, voir `useVersionedFields`. */
export function useOralFields(
  moduleId: string,
  assessmentId: string,
  subjectId: string,
  init: FieldsInit,
) {
  const save = useCallback<FieldSaver>(
    (field, value, baseVersion, force) =>
      saveOralField(moduleId, assessmentId, subjectId, field, value, baseVersion, force),
    [moduleId, assessmentId, subjectId],
  );
  return useVersionedFields(save, init);
}

/**
 * Enregistrement champ par champ. Chaque champ porte sa version : un
 * enregistrement n'écrase jamais une saisie plus récente (conflit : les deux versions sont gardées
 * et Marie choisit). Coupure réseau : le texte reste dans la page, l'envoi reprend seul.
 */
export function useVersionedFields(save: FieldSaver, init: FieldsInit) {
  const [values, setValues] = useState<Record<string, string>>(init.values);
  const [saved, setSaved] = useState<Record<string, string>>(init.values);
  const [conflicts, setConflicts] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);
  const [inflight, setInflight] = useState(0);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const versions = useRef<Record<string, number>>({ ...init.versions });
  const latest = useRef<Record<string, string>>({ ...init.values });
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const busy = useRef<Set<string>>(new Set());
  const savedRef = useRef<Record<string, string>>({ ...init.values });
  const conflictsRef = useRef<Record<string, string>>({});

  const send = useCallback(
    async (field: string, force = false) => {
      if (busy.current.has(field)) return;
      if (!force && field in conflictsRef.current) return;
      const sent = latest.current[field] ?? "";
      busy.current.add(field);
      setInflight((n) => n + 1);
      try {
        const res = await save(field, sent, versions.current[field] ?? 0, force);
        if (res.ok) {
          versions.current[field] = res.version;
          savedRef.current = { ...savedRef.current, [field]: sent };
          setSaved(savedRef.current);
          setFailed(false);
          setSavedAt(frTime());
          const { [field]: _gone, ...rest } = conflictsRef.current;
          void _gone;
          conflictsRef.current = rest;
          setConflicts(rest);
          // Tapé davantage pendant l'envoi : on renvoie.
          if ((latest.current[field] ?? "") !== sent) {
            clearTimeout(timers.current[field]);
            timers.current[field] = setTimeout(() => void send(field), AUTOSAVE_MS);
          }
        } else if (res.conflict) {
          versions.current[field] = res.version;
          conflictsRef.current = { ...conflictsRef.current, [field]: res.theirs };
          setConflicts(conflictsRef.current);
        } else {
          setFailed(true);
          clearTimeout(timers.current[field]);
          timers.current[field] = setTimeout(() => void send(field), RETRY_MS);
        }
      } catch {
        // Coupure réseau : on garde le texte et on réessaie.
        setFailed(true);
        clearTimeout(timers.current[field]);
        timers.current[field] = setTimeout(() => void send(field), RETRY_MS);
      } finally {
        busy.current.delete(field);
        setInflight((n) => n - 1);
      }
    },
    [save],
  );

  const set = useCallback(
    (field: string, value: string, immediate = false) => {
      latest.current = { ...latest.current, [field]: value };
      setValues(latest.current);
      clearTimeout(timers.current[field]);
      timers.current[field] = setTimeout(() => void send(field), immediate ? 0 : AUTOSAVE_MS);
    },
    [send],
  );

  /** Conflit : garder sa version (écrase la leur, à la demande de Marie). */
  const keepMine = useCallback((field: string) => void send(field, true), [send]);

  /** Remplace la valeur d'un champ par une valeur déjà enregistrée côté serveur (proposition posée, par exemple). */
  const adopt = useCallback((field: string, value: string) => {
    latest.current = { ...latest.current, [field]: value };
    savedRef.current = { ...savedRef.current, [field]: value };
    setValues(latest.current);
    setSaved(savedRef.current);
  }, []);

  /** Conflit : prendre l'autre version. */
  const takeTheirs = useCallback((field: string) => {
    const theirs = conflictsRef.current[field] ?? "";
    latest.current = { ...latest.current, [field]: theirs };
    savedRef.current = { ...savedRef.current, [field]: theirs };
    setValues(latest.current);
    setSaved(savedRef.current);
    const { [field]: _gone, ...rest } = conflictsRef.current;
    void _gone;
    conflictsRef.current = rest;
    setConflicts(rest);
  }, []);

  /** Envoie tout de suite ce qui n'est pas enregistré et attend la fin (avant de valider une réponse). */
  const flush = useCallback(async () => {
    for (const field of Object.keys(latest.current)) {
      clearTimeout(timers.current[field]);
      if ((latest.current[field] ?? "") !== (savedRef.current[field] ?? "")) await send(field);
    }
    for (let i = 0; i < 60 && busy.current.size > 0; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }, [send]);

  // Retour du réseau : on renvoie tout de suite ce qui n'est pas enregistré.
  useEffect(() => {
    const onOnline = () => {
      for (const field of Object.keys(latest.current)) {
        if ((latest.current[field] ?? "") !== (savedRef.current[field] ?? "")) void send(field);
      }
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [send]);

  const dirty = Object.keys(values).some((f) => (values[f] ?? "") !== (saved[f] ?? ""));
  const hasConflict = Object.keys(conflicts).length > 0;

  // Avertissement du navigateur avant de quitter avec une saisie non enregistrée.
  useEffect(() => {
    if (!dirty && !hasConflict) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty, hasConflict]);

  return {
    values,
    set,
    conflicts,
    keepMine,
    takeTheirs,
    adopt,
    flush,
    dirty,
    saving: inflight > 0,
    failed: failed && dirty,
    hasConflict,
    savedAt,
  };
}
