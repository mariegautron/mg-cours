# Lot 0 — colonnes et tables peut-être mortes : usage dans le code

Grep du 12 nov. 2026 sur `src/` (composants, pages profondes, `lib`, routes API), hors
`src/types/database.ts` (types générés). À croiser avec la requête 7 de
`supabase/snapshots/diagnostic-schema.sql` (lignes remplies en base). Rien n'est supprimé à ce
stade : une suppression éventuelle relève du lot 9, avec accord.

Remarque générale : `src/app/api/export/route.ts` (export complet des données de Marie) fait un
`select *` sur toutes les tables de sa liste. Toute colonne d'une table exportée est donc « lue »
par l'export ; une suppression doit retirer la table de cette liste (`oral_slot`,
`project_submission`) et la note de commentaire (`import_ref`).

| Colonne / table | Lue ? | Écrite ? | Où | Verdict |
| --- | --- | --- | --- | --- |
| `student.scholar_group` | **Oui** | Non | `src/app/api/search/route.ts:72` (recherche globale : affiche la promo à côté du nom, l.53) | Dépréciée par `20261002000500_student_year.sql` (« plus lue ni écrite »), mais **encore lue par la recherche**. Les autres `scholar_group` du code visent `student_year.scholar_group`. À basculer sur `student_year` avant toute suppression. |
| `student.photo_url` | Oui (secours) | Non | `src/lib/dashboard/queries.ts:73`, `src/lib/dashboard/overview-queries.ts:36` (`photo_path \|\| photo_url` pour compter les photos) | Ancien champ, remplacé par `photo_path`. Lu seulement en repli. Mort si la requête 7 donne 0. |
| `course.slides` (jsonb) | Oui | Non | `src/lib/modules/empty-sessions.ts:25` (une séance avec diapos n'est pas « vide ») | Plus aucune écriture. Mort si la requête 7 donne 0 ligne `<> '[]'`. |
| `module.hours_lecture` / `hours_td` / `hours_tp` (CM/TD/TP) | Oui | Oui | `src/components/modules/module-form.tsx:134-154`, `src/app/(app)/modules/actions.ts:47-49` (saisie) et `:467-469` (copie de module), `src/lib/ynov/outline.ts:76-78, 181-183` (trame) | **Vivantes.** Ne pas supprimer. |
| `pedagogical_outline.pdf_path` | Oui | Oui | Écrit : `src/app/(app)/modules/[id]/outline/actions.ts:70` (« Marquer comme envoyée »). Lu : `outline/page.tsx:224`, `src/app/api/modules/[id]/outline/route.ts:44-47` (téléchargement) | **Vivante** (page Progression, liée depuis Facturation). |
| `invoice.pdf_path` | Non | Non | Aucune occurrence pour `invoice` (les seuls `pdf_path` sont ceux de la progression) | Morte dans le code. `invoice` elle-même reste lue/écrite (`billing/actions.ts`, `lib/invoice/queries.ts`). |
| `invoice.xml_path` | Non | Non | Aucune occurrence | Morte dans le code. |
| `assessment.subject_versions` | Oui | Oui | `src/app/(app)/modules/[id]/assessments/prep-actions.ts:47`, `[assessmentId]/page.tsx:672`, formulaire `src/components/assessments/exam-kind-form.tsx` | **Vivante.** Valeur ≠ `single` à mesurer (requête 7). |
| `assessment.makeup_prepared` | Oui | Oui | `prep-actions.ts:54`, `[assessmentId]/page.tsx:674` | **Vivante.** |
| `assessment.submission_mode` | Oui | Oui | `prep-actions.ts:52`, `[assessmentId]/page.tsx:673, 835` | **Vivante**, mais doublon de sens avec `submit_mode` (lot 6 : voir la requête 4). |
| `open_review.proposals` | Non | Non | Aucune occurrence (les `proposals` du code sont des variables locales : `lib/appreciations/queries.ts`, `lib/modules/matching.test.ts`) | Réservée « étape suivante », jamais branchée. Morte dans le code. |
| table `import_ref` | Non | Non | Seulement citée dans un commentaire, `src/app/api/export/route.ts:77` (exclue de l'export) | Morte dans le code (imports Notion/Moodle d'origine). Compter ses lignes avant décision. |
| table `oral_slot` | Oui | Oui | `src/app/(app)/modules/[id]/assessments/[assessmentId]/oral/actions.ts:46-171`, `oral/page.tsx:44`, `src/lib/assessments/oral-slots.ts:17`, export `route.ts:63` ; page liée depuis `assessments/page.tsx:453` | **Vivante** (passage des oraux). |
| table `project_submission` | Non (sauf export) | Non | Export `route.ts:58` ; commentaire de repli `src/lib/projects/submission-queries.ts:7` (le repli ne lit plus la table) | Remplacée par `submission_item` (migration `20261203000000_doublons_lot1.sql`, D6). Les lignes **sans lien** n'ont pas été reprises : à lister avant toute suppression (requête 7, dernière ligne). |

Tables `checkpoint` / `checkpoint_result` : déjà supprimées par
`20261202000000_drop_checkpoints.sql`, non incluses.

## Candidats pour le lot 9 (sous réserve des chiffres et de l'accord d'Arnaud)

- Morts dans le code : `invoice.pdf_path`, `invoice.xml_path`, `open_review.proposals`, table
  `import_ref`, table `project_submission` (après reprise ou abandon assumé des lignes sans lien).
- Morts après une petite bascule : `student.scholar_group` (recherche → `student_year`),
  `student.photo_url` (retirer le repli), `course.slides` (retirer le test des séances vides).
- À garder : heures CM/TD/TP, `pedagogical_outline.pdf_path`, `subject_versions`,
  `makeup_prepared`, `submission_mode` (doublon traité au lot 6), `oral_slot`.
