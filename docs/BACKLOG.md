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

## E4 — Étudiants + Groupes ✅

| US          | Contenu                                                                                                                                       | Statut |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| US-13/US-14 | CRUD étudiant·e (prénom, nom, e-mail, n° étudiant, promotion, notes perso)                                                                    | ✅     |
| US-14       | Liste : recherche + filtres promotion / module                                                                                                | ✅     |
| US-12       | Import CSV/XLSX avec aperçu (dry-run) puis confirmation ; alias de colonnes tolérants aux accents/casse ; détection doublons (fichier + base) | ✅     |
| US-15       | Créer un groupe (tp/td/projet) dans un module                                                                                                 | ✅     |
| US-16       | Voir les groupes d'un module + effectif                                                                                                       | ✅     |
| —           | Ajouter/retirer des membres (picker)                                                                                                          | ✅     |
| —           | e2e : étudiant → groupe → ajout membre, et import CSV bout en bout, axe 0 violation                                                           | ✅     |

Écrans : `/students`, `/students/new`, `/students/[id]`, `/students/[id]/edit`,
`/students/import`, `/modules/[id]/groups/new`, `/modules/[id]/groups/[groupId]`
(+ section « Groupes » sur `/modules/[id]`). Détail : `docs/SPEC.md`.

**Bug trouvé et corrigé par les e2e** : `XLSX.read(arrayBuffer, {type:"array"})` décodait le
CSV en Latin-1 (accents cassés → colonnes non reconnues → tout en erreur). Fix : décodage
UTF-8 explicite pour les `.csv` avant parsing ; test de régression sur un vrai classeur XLSX
binaire pour vérifier que ce chemin reste correct.

Reporté (hors MVP) : upload de la photo du trombinoscope (Storage, comme les fichiers de
ressources en E2) — `photo_url` existe en base, pas d'UI d'upload pour l'instant ; comparaison
automatique des notes Hyperplanning (E7/E8).

## E5 — Évaluations + Notation ✅

| US          | Contenu                                                                                                                                 | Statut |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| US-17/18    | Grilles de correction réutilisables (critères « Libellé \| points », barème auto) : liste, création, édition, suppression               | ✅     |
| US-19/20    | Évaluations par module (groupe cible, grille optionnelle, coefficient, note de groupe ou individuelle) : création, édition, suppression | ✅     |
| US-20/21    | Saisie des notes : par critère (total auto) ou note directe ; 1 note pour le groupe, ou 1 par membre                                    | ✅     |
| US-22/23/24 | Commentaires prédéfinis : CRUD + recherche/filtres + sélection à la saisie                                                              | ✅     |
| US-11/27    | Compteur « X/Y notes requises » réel (1 évaluation notée = 1 note YNOV) + moyenne pondérée ×1/×3 par étudiant·e                         | ✅     |
| —           | e2e : grille → groupe → évaluation → note → compteur → moyenne, axe 0 violation                                                         | ✅     |

Écrans : `/assessments` (vue globale), `/assessments/grids…`, `/assessments/comments…`,
`/modules/[id]/assessments` (compteur + liste + moyennes), `…/new`, `…/[assessmentId]`
(saisie), `…/[assessmentId]/edit`. Détail : `docs/SPEC.md`.

Reporté : export PDF des résultats + envoi e-mail aux étudiant·es (E6) ; éditeur dynamique de
critères (saisie texte « Libellé | points » en V1).

## E6 — Documents ✅

| US     | Contenu                                                                                                                                                       | Statut                                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| US-30  | **Trame pédagogique PDF** (instantané figé, « Progression pédagogique », dates de MAJ par séance)                                                             | ✅                                                         |
| US-00f | Statuts trame : générée → marquée envoyée (date) → validée ; `advanceTo` fait avancer l'état iceberg sans reculer                                             | ✅                                                         |
| US-28  | Export PDF des résultats d'une évaluation (1 fiche par étudiant·e, ou 1 pour le groupe) avec détail par critère, appréciation, commentaires                   | ✅                                                         |
| US-29  | Envoi e-mail des résultats via Resend (PDF individuel en pièce jointe ; étudiant·es sans e-mail listé·es)                                                     | ✅ code — **à activer** : `RESEND_API_KEY` + `RESEND_FROM` |
| —      | **Réglages** : profil prestataire (nom, adresse, SIRET validé 14 chiffres, TVA/293 B, tarif, RIB) + écoles (SIRET, e-mail facturation, id. Plateforme Agréée) | ✅                                                         |
| US-31  | Export PDF de tous les cours d'un module                                                                                                                      | ⏳ reporté (non bloquant pour le 12/10)                    |

Écrans : section « Trame pédagogique » de `/modules/[id]`, boutons d'export/envoi sur
`/modules/[id]/assessments/[assessmentId]`, `/settings` (+ `/settings/schools/…`).
API PDF : `GET /api/modules/[id]/outline`, `GET /api/modules/[id]/assessments/[assessmentId]/results`.

## E7 — Facturation YNOV ✅

| US       | Contenu                                                                                                                                                                       | Statut                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| US-29    | Blocage : trame envoyée + notes ≥ minimum + 5 documents administratifs (dont « notes saisies dans Hyperplanning ») ; raisons listées ; **revérifié côté serveur**             | ✅                                      |
| US-34    | Mentions obligatoires vérifiées avant émission (profil, SIRET, TVA/293 B, IBAN valide modulo 97, école, adresse, e-mail de facturation, YCODE, **référence bon de commande**) | ✅                                      |
| US-34/38 | Facture **Factur-X EN 16931** : PDF/A-3 (polices Inter embarquées) + XML CII, **validé XSD + Schematron à chaque émission** (TVA 20 % et franchise 293 B)                     | ✅                                      |
| —        | Numérotation `AAAA-NNN` séquentielle, montants arrondis au centime, échéance « 30 jours fin de mois »                                                                         | ✅                                      |
| US-35    | Envoi par e-mail à l'école (Resend, objet `FACTURE – [nom] – [N°]`, un seul fichier) ou marquage manuel « envoyée » (dépôt PA)                                                | ✅ code — e-mail **à activer** (Resend) |
| US-36    | Suivi : à envoyer → envoyée → payée ; état iceberg avance (`invoice_ready` → `invoice_sent` → `paid`) ; suppression possible tant que non envoyée                             | ✅                                      |
| US-33/37 | Écran `/billing` (prêt / bloqué / facturé par module) + carte dashboard + section sur chaque module                                                                           | ✅                                      |
| —        | e2e : parcours complet blocages → notes → trame → documents → facture → téléchargements PDF/XML → envoyée → payée, axe 0 violation                                            | ✅                                      |

Écrans : `/billing`, `/modules/[id]/billing`. API : `GET /api/invoices/[id]/pdf`, `…/xml`.
Migration : `invoice.snapshot` (instantané figé) + unicité 1 facture / module.

**Bug de bundling trouvé par les e2e** : la lib Factur-X charge WASM/XSD/Schematron via
`import.meta.url` → `serverExternalPackages` dans `next.config.ts` (sinon « path argument must be of
type string » en build). À vérifier une fois sur Vercel avec une 1re facture d'essai.

## E8 — Migration Notion ⏳

US-05, US-06, US-16 · script one-shot `scripts/notion-migrate.ts` · import étudiants CSV/XLSX.

## E9 — Recette & prod 🚧

| Tâche                                                                                                                                 | Statut                   |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| CI GitHub Actions verte sur tous les commits (lint, format, typecheck, unit, build, e2e sur Supabase local)                           | ✅                       |
| Prod Vercel joignable ; routes privées et `/api/*` redirigent vers `/login` sans session                                              | ✅ vérifié               |
| Schéma cloud à jour (4 migrations) ; anon ne lit aucune donnée                                                                        | ✅ vérifié               |
| **Isolation RLS** testée (2e compte : lecture/modif/suppression/insertion forgée, 16 tables, anonyme)                                 | ✅ e2e                   |
| Dépendances : `pnpm audit --prod` propre (xlsx → 0.20.3 officiel SheetJS)                                                             | ✅                       |
| En-têtes de sécurité (nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy) + `noindex`                                      | ✅                       |
| `docs/DEPLOY.md` (variables, mise en place Supabase, checklist de recette, retour arrière, risques) ; `docs/ACCESSIBILITY.md` honnête | ✅                       |
| **Fermer les inscriptions Supabase** (Allow new users to sign up = off)                                                               | ⏳ **Marie** (dashboard) |
| Création du compte prod + Réglages + facture d'essai sur Vercel                                                                       | ⏳ **Marie**             |
| Passe RGAA manuelle (clavier, lecteur d'écran, zoom)                                                                                  | ⏳ **Marie**             |
| Migration des données Notion (E8, session dédiée)                                                                                     | ⏳                       |
| Resend configuré (e-mails résultats/factures)                                                                                         | ⏳ **Marie** (optionnel) |

Détail : `docs/DEPLOY.md`.

## Hors MVP (post-12/10)

OCR auto des fiches pédagogiques · import Moodle · compare-notes Hyperplanning automatique ·
versioning ressources · audit `change_log` · dépôt PA automatisé.
