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

## E2 — Ressources 🚧

| US          | Contenu                                                                      | Statut                         |
| ----------- | ---------------------------------------------------------------------------- | ------------------------------ |
| US-00/01/02 | CRUD ressource (titre, description, contenu Markdown, lien, catégorie, tags) | ✅                             |
| US-03/07    | « Utilisée dans N modules » (liste + détail) via `course_resource`           | ✅                             |
| US-04       | Archiver / désarchiver / supprimer (avec confirmation)                       | ✅                             |
| US-03       | Liste : recherche plein texte + filtres catégorie / tag / archivées          | ✅                             |
| —           | e2e authentifié (login seed → création → liste) + axe 0 violation            | ✅                             |
| US-01       | Upload de fichiers joints (Storage)                                          | ⏳ reporté (bucket + policies) |
| US-05/06    | Import Notion / Moodle → E8 (hors E2)                                        | ⏳                             |

Écrans : `/resources`, `/resources/new`, `/resources/[id]`, `/resources/[id]/edit`.
Détail : `docs/SPEC.md`.

## E3 — Modules + Cours ✅

| US          | Contenu                                                                                                 | Statut |
| ----------- | ------------------------------------------------------------------------------------------------------- | ------ |
| US-08       | CRUD module (nom, école, niveau, année, YCODE, heures, dates, référence BC)                             | ✅     |
| US-11       | Badge « minimum de notes requises » (`requiredNotes`)                                                   | ✅     |
| US-09/US-06 | Association de cours à des ressources (multi-sélection, `course_resource`)                              | ✅     |
| —           | `content_last_updated_at` mis à jour à chaque édition de séance (critique trame)                        | ✅     |
| —           | `trame_due_date` = 1re séance − 15 j + alerte (`trameStatus` : ok/warning J-15/urgent J-7/overdue/sent) | ✅     |
| US-13       | Dupliquer un module vers une nouvelle année (module + cours + liens ressources)                         | ✅     |
| US-12       | Checklist documents administratifs (4 cases, `module.admin_docs`) + `iceberg_state` affiché             | ✅     |
| —           | Dashboard connecté (modules actifs, trames urgentes/en retard)                                          | ✅     |
| —           | e2e authentifié (module → séance liée à une ressource → doc coché) + axe 0 violation                    | ✅     |
| —           | Logique pure testée : `src/lib/ynov/iceberg.ts` (13 états) + `trame.ts` (échéance)                      | ✅     |

Écrans : `/modules`, `/modules/new`, `/modules/[id]`, `/modules/[id]/edit`,
`/modules/[id]/courses/new`, `/modules/[id]/courses/[courseId]/edit`. Détail : `docs/SPEC.md`.

Reporté (hors MVP / plus tard) : réordonnancement par glisser-déposer des séances (position
numérique manuelle pour l'instant) ; transition guidée de `iceberg_state` (E7).

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
