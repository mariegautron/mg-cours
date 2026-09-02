# Backlog — MG COURS V1

Statuts : ⏳ à faire · 🚧 en cours · ✅ fait. **Mettre à jour à chaque PR.**

## E0 — Fondations ✅

| Tâche                                                                    | Statut |
| ------------------------------------------------------------------------ | ------ |
| Scaffold Next.js 16 + TS + Tailwind v4 + shadcn                          | ✅     |
| Clients Supabase (`server`, `client`) + `proxy.ts` (garde d'auth)        | ✅     |
| Thème sombre par défaut (next-themes) + tokens shadcn                    | ✅     |
| Shell applicatif : barre latérale, layout `(app)`, login, dashboard stub | ✅     |
| `src/lib/ynov/notation.ts` + tests Vitest                                | ✅     |
| Vitest + Playwright + axe configurés, smoke E2E                          | ✅     |
| CI GitHub Actions (lint → format → typecheck → test → build + e2e)       | ✅     |
| `AGENTS.md` + squelette `docs/`                                          | ✅     |
| Projet Supabase Cloud (prod) + `.env.local` prod (PO)                    | ⏳     |

## E1 — Modèle de données ✅

| Tâche                                                                                                                                           | Statut |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 3 migrations : 16 tables (noms anglais) + 7 enums + helpers                                                                                     | ✅     |
| RLS `owner_id = auth.uid()` sur les 16 tables (`mg_apply_conventions`)                                                                          | ✅     |
| Trigger `updated_at` (moddatetime) partout                                                                                                      | ✅     |
| `seed.sql` : user local, profil, YNOV Nantes + MyDigitalSchool, module _Méthodologies Agile & Scrum_ (21 h, 6 séances), commentaires prédéfinis | ✅     |
| `pnpm db:reset` rejoue tout · `pnpm db:types` → `src/types/database.ts`                                                                         | ✅     |
| `US-11` calcul minimum de notes → `src/lib/ynov/notation.ts` (E0)                                                                               | ✅     |

Dev local : `pnpm db:start` puis `pnpm db:reset`. Identifiants : `marie@local.test` / `password123`.

## E2 — Ressources ⏳

US-00 → US-07 · CRUD, markdown, fichiers, tags, « utilisée dans N modules ».

## E3 — Modules + Cours ⏳

US-08 → US-13 · métadonnées, `required_notes`, association ressources,
`content_last_updated_at`, `trame_due_date`, duplication d'année, checklist d'avancement.

## E4 — Étudiants + Groupes ⏳

US-14 → US-19 · import CSV/XLSX, création manuelle, groupes, trombinoscope, notes perso.

## E5 — Évaluations + Notation ⏳

US-20 → US-27 · grilles, saisie, moyenne pondérée ×1/×3, commentaires prédéfinis, compteur.

## E6 — Documents ⏳

US-10, US-28 → US-32 · trame PDF + « marquer envoyée » + alerte J-15 · export résultats PDF ·
envoi e-mail (Resend).

## E7 — Facturation YNOV ⏳

US-33 → US-39 · checklist iceberg + blocage · facture Factur-X (PDF/A-3 + XML CII) · envoi ·
suivi paiement · alertes dashboard.

## E8 — Migration Notion ⏳

US-05, US-06, US-16 · script one-shot `scripts/notion-migrate.ts` · import étudiants CSV/XLSX.

## E9 — Recette & prod ⏳

E2E complet · import réel · déploiement Vercel + Supabase.

## Hors MVP (post-12/10)

OCR auto des fiches pédagogiques · import Moodle · compare-notes Hyperplanning automatique ·
versioning ressources · audit `change_log` · dépôt PA automatisé.
