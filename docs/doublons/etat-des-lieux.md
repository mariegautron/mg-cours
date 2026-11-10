# Doublons : état des lieux dans `main` (10 novembre 2026)

Étape 0 du chantier. Pour chaque fiche D1 à D38 de `rapport.md` : ce qu'il en est dans le code de
`main` au commit `eb38c77`, avant le lot 1.

- **reste** : le doublon est toujours là, tel que décrit.
- **déjà fait** : il a disparu.
- **changé** : il a changé de forme ; la phrase dit ce qui reste.

## Vérifications préalables

- `git status` : rien de modifié dans le code. Seuls `.gitignore` (réglages locaux) et des fichiers
  non suivis (`.claude/`, `avant.tsv`, `apres.tsv`, `docs/doublons/`) sont en attente.
- `git log -5` : dernier commit `eb38c77` (cartes de groupe, personne partie).
- La branche `parcours-paralleles` est **fusionnée** dans `main` : elle pointe sur le même commit
  (`eb38c77`) et `git diff main...parcours-paralleles` est vide. Aucun fichier n'est à éviter.

## Bilan

Aucune fiche n'est entièrement faite. 30 restent telles quelles, 8 ont changé de forme (D5, D12,
D15, D19, D22, D24, D37, D38).

## A. Corriger et noter

| Fiche | État | Ce qu'il en est |
| ----- | ---- | --------------- |
| D1 | reste → **fait au lot 1** | L'espace de l'oral gardait sa propre présence (`oral_space.attendance`), lue avant celle de la copie et réécrite sur la copie à « Écrire la note ». |
| D2 | reste → **fait au lot 1** | La page `/compare` (`CriterionComparison`, en points) existait toujours, liée depuis la vue d'ensemble de la correction et depuis `GradingSession`. |
| D3 | reste → **fait au lot 2** | Sur un oral, l'en-tête a toujours deux boutons principaux : « Faire passer l'oral » et « Corriger » (`[assessmentId]/page.tsx` l. 545-563). |
| D4 | reste → **fait en partie au lot 2** | « Corriger » sur un QCM ouvre `/correct` (`GradingSession` + `QcmAnswersPanel` en lecture seule), pas le suivi du QCM. |
| D5 | changé → **fait au lot 2** | Les deux blocs ne s'affichent plus en même temps (bandeau si tout est corrigé, bloc du bas sinon). Mais le bandeau n'existe que dans la mise en page « note de groupe » : une évaluation individuelle entièrement corrigée n'a, semble-t-il, aucun « Envoyer les résultats » (à vérifier à l'écran). |
| D6 | reste → **fait au lot 1** | Le bloc « Rendus — … » (`Submissions`, table `project_submission`) était toujours au-dessus de « Rendus déposés ». |
| D7 | reste → **fait au lot 2** | Deux mises en page (groupe l. 613-931, individuelle ensuite) : « Le cadre pour les étudiant·es » ×2, grille ×2, « Le jour J » ×2, « Phrases » ×2, « Modifier » ×3. |
| D8 | reste | Phrases à quatre endroits : `/assessments/comments`, page `phrases` d'une évaluation, Réglages (`PhraseManager`), en-tête de la liste Évaluations (en plus de la Bibliothèque). |
| D9 | reste | Bouton « Grilles » toujours dans l'en-tête d'Évaluations, en plus de la Bibliothèque. |
| D10 | reste → **fait au lot 2** | « Le bilan » d'Où j'en suis affiche toujours la « Moyenne de la classe ». Le calcul commun des moyennes n'a pas été vérifié. |
| D11 | reste → **fait au lot 2** | Le compteur de notes est toujours à cinq endroits (pastille, « Le module en chiffres », page des groupes, page Évaluations, colonne de gauche d'« Ajouter une évaluation »). |

## B. Suivre son module

| Fiche | État | Ce qu'il en est |
| ----- | ---- | --------------- |
| D12 | changé → **fait au lot 3** | `finishChecklist` alimente maintenant `moduleSteps` (`lib/modules/journey.ts`) : Où j'en suis, la liste des modules et le bouton d'en-tête disent la même chose, et Terminer compte les appréciations. Reste : `lib/dashboard/todo.ts` garde son propre calcul (progression, appréciations, rattrapages, facture). |
| D13 | reste → **fait au lot 3** | La prochaine étape est toujours dite trois fois sur Où j'en suis (bouton d'en-tête du layout, `JourneyHero`, pastille de la liste). |
| D14 | reste → **fait au lot 3** | `UpcomingAssessmentsCard`, puis la carte « À venir », puis la carte « Les évaluations ». |
| D15 | changé → **fait au lot 4** | La page Jalons et les tables `checkpoint` ont disparu (commit `10f9ddb`) ; le point d'étape a la case « Noté ». Reste : la case « Jalon du projet fil rouge », la ligne « Jalons du projet : N » sur Évaluations, les « Jalon i » du squelette de projet, et les actions « Noter la phase » (le composant `PhaseList` n'est plus importé). |
| D16 | reste → **fait au lot 3** | « Archiver » dans Documents et dans Facture, « Terminer » et « Archiver » dans la liste, onglets « Terminés » et « Rangés ». |
| D17 | reste → **fait au lot 3** | « Supprimer » à trois endroits (Zone sensible d'Où j'en suis, Documents > Actions, liste) ; « Dupliquer pour l'année » dans Documents > Actions. |
| D18 | reste → **fait au lot 3** | « Ce que je retiens » se saisit dans la liste et dans la carte d'Où j'en suis, en plus de la page Terminer ; les mots de séance sont recopiés dans Documents > Actions. |
| D19 | changé → **fait au lot 3** | Le dépôt de facture a quitté Documents (renvoi vers Facture). Restent : `AdminDocsChecklist` dans Documents et dans Facture, et le bloc « Facturation » de Documents. |
| D20 | reste → **fait au lot 3** | Trois entrées : Facture du module, renvoi de Documents, page Facturation (qui est maintenant aussi dans le menu). |

## C. Préparer et faire cours

| Fiche | État | Ce qu'il en est |
| ----- | ---- | --------------- |
| D21 | reste | La route `/build` redirige toujours (`build/actions.ts` n'est importé nulle part). L'éditeur de planning est déjà un seul composant (`ScheduleEditor`, `ScheduleForm` n'est qu'une enveloppe). Où j'en suis et Attendus envoient vers `/schedule`. |
| D22 | changé | Le Planning a maintenant une entrée depuis Séances (`session-list.tsx`). Pas encore d'entrée depuis l'étape « Construire les séances » d'Où j'en suis. La refonte reste à cadrer avec Marie. |
| D23 | reste | En bas de la séance : « ← Retour au module » et « Séance suivante → ». |
| D24 | changé | « Ouvrir ma vue privée » et « Commencer » sont fusionnés (un seul geste ouvre les deux fenêtres). Restent : « Carnet » sur la séance (à côté de « Modifier la clôture ») et « Ouvrir mon carnet » sur le tableau de bord. |
| D25 | reste | Le bloc Moodle est sur chaque séance ; second bouton de progression dans `outline-actions.tsx` ; Documents n'a pas de section « Pour Moodle ». |
| D26 | reste | « Générer un QCM » (`quiz/generate`, liée trois fois), famille « quizzes » de la Bibliothèque, mini-QCM de séance. La famille « quizzes » renvoie peut-être déjà vers `/questions` (`family.ts`) : à vérifier. |
| D27 | reste | `/expectations`, `/matching` et `/couverture` existent ; étape « Rapprocher les ressources » dans Où j'en suis ; la séance renvoie vers `/matching`. |
| D28 | reste | `RetainedResources` (séance, Séances, nouvelle séance, modifier, Rapprocher, Où j'en suis), `retained/actions.ts` et « Ajouter au module… » de la Bibliothèque. |

## E. Étudiant·es et espace étudiant

| Fiche | État | Ce qu'il en est |
| ----- | ---- | --------------- |
| D29 | reste | `/resultats/[jeton]` et `/q/[jeton]` affichent leur propre page, sans renvoi vers l'espace ; « Publier et créer le lien de la classe » existe toujours. |
| D30 | reste | Liens perso créés à quatre endroits (Espace étudiant·es, fiche étudiant·e, Envoyer les résultats, Liens du QCM). |
| D31 | reste | `results/preview` existe et est appelé depuis Résultats. |
| D32 | reste | « Nouveau groupe » est un écran à part (`groups/new`), lié depuis la page des groupes et depuis le tableau de bord (« Constituer les groupes »). Le module a déjà son propre import (`groups/import`). |
| D33 | reste | « Vue de classe » sur la page des groupes ; noms mélangés (« Journal d'observations », « Observations de cours »). |
| D34 | reste | Étiquette « Absent·e ou retard » du Carnet (`lib/notebook/notebook.ts`). La présence de l'espace de l'oral est retirée au lot 1 (D1). |

## F. Se repérer dans l'appli

| Fiche | État | Ce qu'il en est |
| ----- | ---- | --------------- |
| D35 | reste | Liste globale : « Grilles », « Phrases » et le filtre « À noter ». |
| D36 | reste | Bas de Modules : « ← Aujourd'hui », « Évaluations », « Facturation » ; pas d'onglet « À facturer ». |
| D37 | changé | La plupart des pages n'ont plus qu'un retour, en haut. Restent : Rapprocher (deux retours), le bas de la séance, et Appréciations qui revient vers Évaluations. |
| D38 | changé | La carte « Évaluations à venir » et la tuile « À faire » ont disparu. Restent : « Tes modules en cours », et « À corriger » compté deux fois (ligne de chiffres et carte). |

## Code mort (section 4 du rapport)

| Fichier | État |
| ------- | ---- |
| `lib/ynov/next-step.ts` | **pas mort** : importé par `lib/invoice/queries.ts`. À garder. |
| `lib/modules/completion.ts` | mort (seul son test l'importe). |
| `components/modules/course-list.tsx` | mort. |
| `components/modules/expectations-summary.tsx` | mort. |
| `components/modules/schedule-editor.tsx` | **pas mort** : assistant, `ScheduleForm`, `ModuleForm`. À garder. |
| `components/students/group-members.tsx` | **pas mort** : page d'un groupe, `ModuleRoster`. À garder. |
| `components/modules/resource-picker.tsx` | **pas mort** : `CourseForm`. À garder. |
| Route `/modules/[id]/build` | redirige toujours ; `build/actions.ts` n'est importé nulle part. |
