# Lot 9 — candidats à la suppression (préparation, aucun drop)

État au 12 nov. 2026, après le commit de préparation du lot 9. Chiffres : prod du 12/11
(diagnostic et contrôles des lots 0 à 8) ; à reconfirmer avec `docs/schema-bdd/lot9-candidats.sql`
(lecture seule) juste avant toute suppression. **Arnaud valide colonne par colonne** ; chaque drop
sera une migration à part, avec sauvegarde des valeurs non vides si besoin et retour arrière.

`hours_lecture` / `hours_td` / `hours_tp` : **hors liste**, gardées (PDF de progression envoyé à l'école).

Rappel : l'export complet (`src/app/api/export/route.ts`) fait un `select *` sur ses tables ; une
colonne supprimée disparaît simplement de l'export.

| Candidat | Encore lu / écrit par le code ? | Lignes remplies (12/11) | Recommandation |
| --- | --- | --- | --- |
| `assessment.coefficient` | **Non** (ce commit : plus écrit pour la Note de l'école, plus recopié par la duplication ni le rattrapage, plus lu par le formulaire). Seul le nom du champ de formulaire « coefficient » reste (il alimente `coefficient_override`). | 32 lignes, toutes non nulles (défaut 1) ; 10 individuelles à 1 au lieu de 3, jamais lues | **Supprimer.** Rien à sauvegarder (valeur ignorée depuis le lot 3). |
| `assessment.submission_mode` | Non (lot 6) | 4 / 32 | **Supprimer.** `submit_mode` fait foi. Les 4 valeurs peuvent être gardées dans la migration en commentaire (dont la contradictoire « app » / elsewhere). |
| `assessment.exam_kind` | **Oui** : écrit à chaque enregistrement (déduit du type) ; lu par « Quelle épreuve ? », le cadre projeté, le jour J, le dépôt, et en secours de `kind` | 24 / 32 | **Garder pour l'instant.** À retirer seulement après avoir fait lire `kind` à ces écrans (prochain chantier) ; ensuite supprimer. |
| `assessment.subject_versions` | **Oui** : choix « Un sujet pour tous / Deux versions A et B » de « Quelle épreuve ? » | 0 / 32 différent de « single » | **Décision produit** : la fonction n'a jamais servi. Si Marie n'en veut pas, retirer le choix puis la colonne ; sinon garder. |
| `assessment.makeup_prepared` | **Oui** : case « sujet de rattrapage préparé d'avance » de « Quelle épreuve ? » | 0 / 32 | **Décision produit**, comme ci-dessus (le vrai rattrapage passe par `makeup_of_id`). |
| `grade.is_group_grade` | Non (lot 6 ; la cible vient de `student_id` / `student_group_id`) | à recompter (requête 1) ; les nouvelles copies de groupe l'ont à `false` | **Supprimer.** Aucune contrainte ne l'utilise. |
| `student.scholar_group` | Non (lot 6 : la recherche lit `student_year`) | 86 / 105 ; **0** promotion sans équivalent dans `student_year` (contrôle lot 6, requête 6) | **Supprimer**, après la requête 2 de `lot9-candidats.sql` à 0. |
| `student.photo_url` | Non (lot 6) | 0 / 105 | **Supprimer.** |
| `course.slides` | Non (ce commit : plus lu par « séance vide ») | 0 / 59 | **Supprimer.** Les diapos sont `course.slides_url`. |
| table `project_submission` | Non (ce commit : retirée de l'export ; remplacée par `submission_item`) | 0 ligne | **Supprimer** la table. |
| `open_review.proposals` | Non (jamais branchée) | 0 / 1 | **Supprimer.** |
| `invoice.pdf_path`, `invoice.xml_path` | Non (le PDF / XML Factur-X est recalculé à la demande) | table `invoice` vide | **Supprimer.** |
| `pedagogical_outline.pdf_path` | **Oui** : écrit à « Marquer comme envoyée », lu pour télécharger la version envoyée | 1 / 4 | **Garder** (fonction vivante). |
| anciennes politiques `assessment_expectation_owner`, `expectation_dismissal_owner`, `expectation_resource_owner` | Non (base seulement) | — (équivalentes à `mg_owner_all`, posée au lot 1) | **Supprimer** (`drop policy`), sans effet sur les droits. Requête 3 pour les lister. |
| table `import_ref` | Non (citée dans un commentaire de l'export, exclue de l'export) | 1 374 lignes (imports Notion / Moodle d'origine) | **Garder pour l'instant**, ou sauvegarder puis supprimer : c'est la seule trace « page Notion → ligne créée ». Utile si un réimport Notion est envisagé ; sinon, export CSV (requête 4 pour la répartition) puis drop. |

## Ordre proposé pour la migration de suppression (quand Arnaud valide)

1. Politiques `*_owner` (sans risque).
2. Colonnes vides ou ignorées : `course.slides`, `student.photo_url`, `open_review.proposals`,
   `invoice.pdf_path`, `invoice.xml_path`, `grade.is_group_grade`, `assessment.coefficient`,
   `assessment.submission_mode`.
3. Table `project_submission`.
4. `student.scholar_group` (après la requête 2 à 0).
5. Plus tard, après décision ou nouveau chantier : `subject_versions`, `makeup_prepared`,
   `exam_kind`, `import_ref`.

Avant chaque drop : régénérer les types (`pnpm db:types`) ou retirer la colonne de
`src/types/database.ts`, typecheck, puis contrôle avant / après avec l'empreinte des notes.
