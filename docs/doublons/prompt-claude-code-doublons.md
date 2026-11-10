# Prompt pour Claude Code : retirer les doublons de MG COURS (9 novembre 2026)

Copie tout ce qui suit dans Claude Code, lancé dans le dépôt de MG COURS.

---

Tu travailles sur MG COURS, l'appli de Marie, enseignante. Un audit a relevé 38 doublons : des écrans, des boutons ou des notions qui font la même chose. Le rapport complet est dans `/mnt/project-files/doublons/rapport.md` (fiches D1 à D38). Lis-le avant de commencer.

**Principe d'Arnaud** : ne rien garder d'inutile. On préfère retirer plutôt que dupliquer. Pour chaque geste, une seule façon de le faire, au seul endroit où Marie en a besoin.

## Règles de travail

- Commit direct sur `main`, un commit par lot (ou par fiche si le lot est gros). Arnaud pousse lui-même.
- **Ne lance ni tests ni `pnpm build` sur ce PC** : il a planté le 9 novembre. Lance seulement le typecheck et le lint des fichiers modifiés. Vercel fait le build. Utilise Node 22 (`nvm use 22`).
- Mets à jour `docs/PARCOURS.md` à chaque lot : quel écran disparaît, et par quoi il est remplacé.
- **Ne casse aucune adresse.** Une page retirée redirige vers celle qui la remplace. Un lien déjà envoyé à des étudiant·es continue de marcher.
- **Aucune perte de données.** Avant de retirer un stockage (présence de l'oral, table `project_submission`, ressources « retenues »…), écris une migration qui recopie les données dans le stockage gardé. Montre à Arnaud le résultat d'un `SELECT` de contrôle (avant/après) et attends son accord avant toute migration qui supprime une colonne ou une table.
- Les notes déjà écrites et publiées (module SCRUM) ne doivent pas changer. Après chaque lot du bloc « Corriger », vérifie que les notes du module SCRUM sont identiques avant et après (requête de comptage et de somme par évaluation).
- Aucun service d'IA externe.
- Avant de supprimer un fichier présenté comme mort, cherche-le dans tout le dépôt (`grep -r`). L'audit n'a pas pu lire les pages à 8 dossiers de profondeur (`/correct`, `/oral`, `/compare`, `/quiz/*`, `/results`, `/start`, `/notebook`, `/close`).
- Coordination : le prompt `corriger-et-noter/prompt-exigence-ux-correction.md` traite déjà `/compare` (points 1 et 2). Si ce travail est fait, ne le refais pas : applique seulement la suppression (D2). Le prompt `corriger-et-noter/prompt-point-etape.md` recoupe D15 : lis-le et fais D15 à la place de ce qui s'y oppose.

## Lot 1 : une seule vérité pour les notes (bloquant)

1. **D1, présence unique.** La présence d'une personne à une évaluation vit sur la copie (note et personnes) et nulle part ailleurs. L'espace de l'oral (`oral-space-server.ts`, champ `attendance` de la ligne d'espace) lit et écrit cette présence. Il n'en garde plus de copie. Migration : pour chaque ligne d'espace dont la présence diffère de la copie, garde la **copie**, et liste les écarts à Arnaud avant d'écrire.
   - Test à écrire : poser « Absent·e excusé·e » dans « Faire passer l'oral », puis ouvrir la correction de groupe. La même valeur s'affiche, et inversement. Rien n'est écrasé à l'enregistrement.
2. **D2.** `/compare` redirige vers la vue « Par critère » de l'écran de correction en lettres. Supprime `CriterionComparison` et la vue critère de `GradingSession`. La vue « Par critère » garde le tri et « Vérifier mes écarts ».
3. **D6.** Recopie les rendus de `project_submission` dans `submission_item`, puis retire le bloc « Rendus — … » (`Submissions`) de la page d'une évaluation. Seul reste « Rendus déposés ».

## Lot 2 : corriger, un chemin par type

1. **D3.** Sur une évaluation orale, un seul bouton principal : « Faire passer l'oral ». Il ouvre l'espace de l'oral, qui sert aussi à corriger après coup. Retire « Corriger » pour ce type.
2. **D4.** Sur un QCM, « Corriger » mène au suivi du QCM (relecture des copies). La page `/correct` d'un QCM redirige vers le suivi.
3. **D1, suite.** `/correct` ouvre l'espace en lettres du type de l'évaluation. Une fois que plus aucun type n'utilise `GradeForm`, `GradingSession`, `OralStage` et `OralPlan`, supprime-les. L'ordre de passage et le chrono vivent dans l'espace de l'oral. Si un type (QCM, point d'étape) en dépend encore, dis-le dans le compte rendu et laisse ces fichiers.
4. **D7.** La page d'une évaluation n'a plus qu'une mise en page. Les blocs qui dépendent du type (note de groupe ou individuelle, QCM, oral) s'y insèrent. Chaque bloc n'apparaît qu'une fois : grille, ce que voient les étudiant·es, le jour J, phrases. Un seul bouton « Modifier », dans l'en-tête.
5. **D5.** « Envoyer les résultats » : seul le bandeau du haut reste, quand tout est corrigé.
6. **D10, D11.** Retire la moyenne de « Le bilan », la ligne « Évaluations prévues » de « Le module en chiffres », le bloc « Évaluations » de la page Étudiant·es et groupes, et la liste de gauche d'« Ajouter une évaluation ». Vérifie que toutes les moyennes restantes viennent du même calcul.

## Lot 3 : suivre son module, un seul calcul

1. **D12.** `lib/ynov/module-steps.ts` devient la seule source de « ce qu'il reste à faire » pour un module. Le tableau de bord (`lib/dashboard/todo.ts`) reprend l'étape courante de chaque module, plus les tâches qui ne sont pas des étapes (séance à préparer, copies à corriger). La page « Terminer le module » liste les étapes pas faites, appréciations comprises. Supprime les calculs propres de `todo.ts` (progression, appréciations, rattrapages, facture) et de `finish.ts`.
   - Test : sur un même module, le tableau de bord, la liste des modules, le bouton « Prochaine étape » et « Terminer » disent la même chose.
2. **D13, D14.** Sur Où j'en suis, retire la grande carte `JourneyHero`, le bouton « Prochaine étape » de l'en-tête (il reste sur les autres pages du module), la carte `UpcomingAssessmentsCard` et la carte « Les évaluations ».
3. **D16.** Un seul geste, « Terminer le module », sur la page Terminer, atteinte par la dernière étape d'Où j'en suis. Terminer archive le module. Il n'y a plus qu'un onglet « Terminés », avec « Rouvrir ». Retire « Archiver » dans Documents et dans Facture, et le bouton « Terminer » de la liste des modules.
4. **D17.** « Supprimer le module » et « Dupliquer pour l'année » : une seule fois chacun, en bas de « Modifier le module ». Retire la « Zone sensible » d'Où j'en suis, la section « Actions » de Documents, et « Supprimer » dans la liste.
5. **D18.** « Ton retour » s'écrit seulement sur la page Terminer. Sur Où j'en suis d'un module terminé, il s'affiche en lecture.
6. **D19, D20.** Les cases Documents administratifs (Hyperplanning, Moodle…) passent dans « Terminer le module » ; retire-les de Documents et de Facture. Retire le dépôt de facture de Documents (la facture se dépose dans Facture). Retire aussi le bloc « Facturation » de Documents.

## Lot 4 : points d'étape (D15)

Une seule notion : **« Point d'étape »**, non noté, rangé dans le Projet fil rouge (date, qui a rendu quoi, retour donné). C'est la page Jalons actuelle, déplacée sous Projet fil rouge et renommée.
- Retire le bouton « Jalons » de l'en-tête du module (l'adresse `/jalons` redirige).
- Retire la case « Jalon du projet fil rouge » sur une évaluation notée, la ligne « Jalons du projet : 1 », et les « phases » du projet. Avant de retirer les phases, montre à Arnaud combien il y en a en base et sur quels modules.
- Le type d'évaluation « point d'étape » est retiré s'il reste non noté. Les évaluations existantes de ce type deviennent des points d'étape.

## Lot 5 : un seul lien par étudiant·e (D29 à D31)

- L'espace perso devient le seul lien. « Envoyer les résultats » publie dans l'espace : plus de lien de résultats. Le QCM s'ouvre dans l'espace : plus de lien de QCM perso ni de page « Liens » du QCM.
- **Lien de la classe** : les étudiant·es de SCRUM l'ont reçu (Arnaud l'a confirmé). Les liens de la classe existants continuent de marcher **tels quels**. Ne les révoque pas et ne change pas leur contenu. On retire seulement le bouton qui en crée un nouveau.
- **Les liens déjà donnés continuent de marcher.** `/resultats/[jeton]` et `/q/[jeton]` redirigent vers l'espace de la même personne quand elle en a un. Sinon, ils restent affichés comme avant. Ne supprime aucun jeton.
- Le QR du QCM en classe reste.
- Créer un lien perso : seulement dans Espace étudiant·es, plus « Nouveau lien » sur la fiche étudiant·e.
- Retire l'aperçu des résultats (`results/preview`) : « Voir comme un·e étudiant·e » montre déjà les résultats.

## Lot 6 : séances, QCM, attendus, ressources (D21 à D28)

1. **D21.** Un seul composant d'import du planning Hyperplanning, utilisé dans l'assistant « Nouveau module » et depuis Séances. Retire le second formulaire s'il fait la même chose, et la route `/build`.
2. **D22. On garde la vue Planning, et on la retravaille.** Marie s'en sert au début, quand elle prépare son module, mais aujourd'hui elle n'est pas assez utilisable. Pour ce lot, fais seulement deux choses :
   - Donne-lui une vraie entrée : un lien « Planning » depuis Séances et depuis l'étape « Construire les séances » d'Où j'en suis. Aujourd'hui, on ne l'atteint que depuis la frise.
   - Retire son « ← Retour au module » en double (D37).
   **La refonte de la vue n'est pas à faire dans ce prompt.** Il faut d'abord savoir avec Marie ce qu'elle veut y voir et y faire pendant la préparation. Note dans `docs/PARCOURS.md` que la vue Planning est à retravailler pour servir vraiment pendant la préparation du module.
3. **D23.** Sur une séance, retire « Séance suivante → » et « ← Retour au module » en bas de page.
4. **D24.** Vérifie en prod que « Faire cours » est un seul bouton (fenêtre projetée et vue privée). Sinon, fais-le. Retire « Carnet » sur la séance et sur le tableau de bord : le carnet est dans la vue privée, et après la clôture on a « Modifier la clôture ».
5. **D25.** Les exports Moodle (cours en PDF, évaluations en zip, progression en PDF) ne sont plus que dans Documents, sous « Pour Moodle ». Retire-les de chaque séance.
6. **D26.** Une seule banque de questions. Les questions des ressources « mini-QCM » y sont recopiées, liées à leur ressource. Retire la famille « mini-QCM » de la Bibliothèque. Si `quiz/generate` fait la même chose que « Ajouter une évaluation > QCM », retire-la.
7. **D27.** La page « Attendus » montre chaque attendu avec les séances et évaluations qui le traitent, et permet de les lier : c'est la Couverture fusionnée avec la liste des attendus. `/couverture` redirige vers elle. Retire l'étape « Rapprocher les ressources » d'Où j'en suis. Les suggestions de ressources passent dans le sélecteur « Attendus traités » de la séance. Garde `/matching` seulement s'il sert encore à autre chose.
8. **D28.** Une ressource est dans le déroulé d'une séance, rien d'autre. Retire « Ressources retenues » (`RetainedResources`, actions `/retained`) et « Ajouter au module » de la Bibliothèque ; à la place, « Ajouter à une séance… ». Migration : une ressource retenue mais dans aucun déroulé est listée à Arnaud. Rien n'est supprimé de la bibliothèque.

## Lot 7 : navigation et nettoyage

- **D8.** Une seule page « Phrases », dans la Bibliothèque, avec un filtre correction / appréciation. Retire la section de Réglages et la page `phrases` d'une évaluation (redirections). La banque reste insérable pendant la correction et dans l'appréciation.
- **D9, D35.** Retire les boutons Grilles et Phrases de l'en-tête de la liste des évaluations, et le filtre « À noter ».
- **D32.** « Nouveau groupe » devient un bouton de l'assistant de groupes. Depuis un module, l'import inscrit au module et n'envoie plus vers l'import global.
- **D33.** La « Vue de classe » passe de la page des groupes à Appréciations. Un seul mot partout : « Observations ».
- **D34.** Retire l'étiquette « Absent·e ou retard » du Carnet. C'est confirmé : Marie note les absences dans Edusign, sauf aux évaluations. Les étiquettes déjà posées restent visibles en lecture sur la fiche étudiant·e. La présence n'est plus saisie que sur la copie d'une évaluation (lot 1).
- **D36.** En bas de Modules, retire « ← Aujourd'hui » et « Évaluations ». « Facturation » devient un onglet « À facturer » en haut de la liste.
- **D38.** Tableau de bord : retire la tuile « À faire », la carte « Évaluations à venir » (ses lignes passent dans « Cette semaine ») et la carte « Tes modules en cours ».
- **Code mort** : `lib/ynov/next-step.ts`, `lib/modules/completion.ts`, `components/modules/course-list.tsx`, `components/modules/expectations-summary.tsx`, `components/modules/schedule-editor.tsx`, `components/students/group-members.tsx`, `components/modules/resource-picker.tsx`. Supprime chacun s'il n'est importé nulle part.

## Compte rendu attendu à chaque lot

- La liste des écrans, boutons et fichiers retirés, et ce qui les remplace (une ligne par fiche D).
- Les redirections ajoutées.
- Les migrations : la requête de contrôle, avec les chiffres avant et après.
- Ce que tu n'as pas fait, et pourquoi.
