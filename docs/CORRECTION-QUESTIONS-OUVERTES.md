# Correction des questions ouvertes tirées au sort (étape 1, à la main)

Aucun test écrit ni lancé (consigne : ils font planter le poste), pas de PR : commits sur `main`.
Vérifié : `tsc`, ESLint, Prettier. Rien n'a été regardé à l'écran, aucune capture.
Aucun service d'analyse n'est appelé.

## Avant de déployer

1. Sauvegarde de la base cloud, puis relevé : `supabase/snapshots/grades-before-after.sql` (avant.tsv).
2. Appliquer `supabase/migrations/20261119000000_open_review.sql` (ajout seulement : colonne
   `quiz.correction_mode` à `'classic'`, tables `quiz_question_criterion` et `open_review`).
3. Relevé après, `diff` : aucune différence attendue. Refaire après l'ouverture de l'écran.
4. Retour arrière : voir l'en-tête de la migration (deux `drop table`, une colonne).

## Comment le type est reconnu (proposition)

`quiz.correction_mode` : `'classic'` (défaut, tout l'existant) ou `'open_questions'`. Une évaluation
bascule seulement par le bouton « Corriger en questions ouvertes » sur la page du QCM, avec
confirmation. La page de correction affiche alors l'écran de relecture ; sinon rien ne change.

## Où vivent les données

- Attendu : `general_feedback` de la question tirée (déjà figée dans `quiz_attempt.drawn`).
- Réponses : `quiz_attempt.answers` ; points des questions : `manual_scores` (écrit à l'enregistrement,
  puis `regradeAttempt` recalcule `score` et `review_complete` comme avant).
- Rattachement question → critères : `quiz_question_criterion` (panneau « Rattacher les questions aux
  critères »). Rien n'était stocké avant ; une question non rattachée bloque l'écriture de sa copie.
- Décision de Marie : `open_review` (lettre, points, commentaire par question ; commentaire global ;
  lettre par critère ; versions par champ ; verrou ; photo écrite ; historique). `proposals` est
  réservé aux propositions de l'étape 2 et n'est lu nulle part.

## Ce qui est fait

- En-tête : « n réponses validées sur N », trois vues, « Enregistrer dans l'évaluation ».
- Vue d'ensemble (étudiant·es × critères, ordre alphabétique, sans total ni classement, copie non
  rendue en gris), par question (attendu en haut, toutes les réponses), par étudiant·e (copie
  suivante, commentaire global, lettre par critère pré-choisie seulement si les paliers sont égaux).
- Validation : A à D, points pré-remplis d'après le palier du critère rattaché et plafonnés au
  barème, commentaire, Entrée valide, Alt + ↓ réponse suivante, flèches sans enregistrement.
  États : à valider, validée, modifiée après ta validation.
- Enregistrement champ par champ (mêmes briques que l'oral : `decideFieldSave`,
  `saveVersionedField`, `useVersionedFields`) ; l'oral a été ramené sur ces briques communes.
- Écriture tout ou rien (remise en l'état si une étape échoue) des copies prêtes ; les autres restent
  « en cours ». Note = somme des points ramenée au barème. Paliers et commentaires vont à la grille.
- Verrou : copie écrite en lecture seule ; « Rouvrir la copie » la repasse « en cours » (hors
  moyennes), la note publiée ne bouge pas jusqu'au prochain « Mettre à jour », ancienne valeur en
  historique. Une copie déjà corrigée par l'ancienne page s'ouvre en lecture, points repris.
- Résultat étudiant·e : commentaire global, puis chaque critère avec ses questions, commentaires et
  points (« Voir comme l'étudiant·e » inclus). Jamais l'attendu ni les notes privées.

## Correctif au passage

`gradeCompletion` : une note sans aucun point par critère (QCM corrigé par question, note directe)
compte désormais toujours. Sans cela, la règle de complétude du lot précédent aurait sorti des
moyennes les notes de l'Étude de cas déjà corrigée (grille présente, `grade.scores` vide).

## Pas fait / choix

- Le PDF du résultat n'affiche pas encore les questions sous les critères.
- Les propositions et tout ce qui suit (étapes 2 à 5) ne sont pas commencés.
- Mesure à 1366 × 768 et captures des trois vues : non faites. Test des notes inchangées : remplacé
  par le relevé SQL ci-dessus, à lancer par toi.
- Choix : lettre du critère confirmée par Marie (jamais déduite sans elle), points du critère pris
  sur le palier de la grille ; la note vient de la somme des points des questions.
