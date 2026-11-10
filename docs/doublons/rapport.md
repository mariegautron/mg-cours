# Doublons dans MG COURS : audit

*9 novembre 2026. Établi à partir du code de `/home/wilson/Bureau/mg-cours` (lecture seule) et des 13 rapports d'audit déjà dans le dossier du projet. Je n'ai rien modifié.*

## 1. En bref

Tu as raison : l'appli a souvent **deux ou trois façons de faire la même chose**, construites à des moments différents, et l'ancienne est restée quand la nouvelle est arrivée. J'ai relevé **38 doublons**. Les plus graves :

1. **Deux systèmes de correction coexistent** : l'ancien en points (grille à paliers, page « Corriger », « Comparer un critère ») et le nouveau en lettres A à D (oral, rendu, étude de cas). Chacun garde **sa propre présence**, d'où l'écrasement que tu as vu entre « Faire passer l'oral » et la correction de groupe.
2. **Trois calculs de « ce qu'il reste à faire »** qui ne disent pas la même chose : le tableau de bord, « Où j'en suis » et la liste « Terminer le module ».
3. **Cinq sortes de liens pour les étudiant·es** (lien de la classe, espace perso, lien de résultats, lien de QCM perso, QR du QCM en classe), et trois endroits pour les créer.
4. **Six écrans parlent des attendus**, et trois mots différents désignent un jalon (« Jalons », « point d'étape », « Jalon du projet fil rouge »).
5. **Terminer, ranger, archiver, supprimer, dupliquer et « ton retour »** sont proposés à deux ou trois endroits chacun.

Ma règle pour trancher : **une seule façon de faire chaque geste, au seul endroit où Marie en a besoin**. Le reste est retiré. Une ancienne adresse redirige vers la nouvelle, pour qu'aucun lien ne casse.

## 2. Méthode et limites

- J'ai lu les 150 pages de l'appli et les composants qu'elles utilisent. J'ai aussi relevé quels liens mènent à quel écran (un tableau de 500 liens).
- **Je n'ai pas encore pu parcourir la prod** : les identifiants de Marie ne me sont pas arrivés, et le navigateur de ton ordinateur n'est pas disponible pour ce fil. Tout ce qui suit vient du code et des audits précédents. Je ferai le passage en prod dès que j'aurai les identifiants, et je mettrai à jour la colonne « Vu en prod ».
- Les pages situées à 8 dossiers de profondeur ne peuvent pas être copiées depuis ton ordinateur : la page de correction (`/correct`), l'oral (`/oral`), « Comparer » (`/compare`), le suivi du QCM (`/quiz`), les résultats (`/results`), et les écrans « Faire cours », « Carnet », « Clôture ». Je les connais par leurs composants et par les rapports précédents. Le fil qui code devra vérifier ces points dans le code (ils sont signalés « à vérifier »).
- Quand un doublon est déjà signalé dans un audit, je le cite avec sa référence et je ne le redétaille pas.

## 3. Les doublons, par parcours

Chaque fiche indique : **où**, **ce qui se recoupe**, **à garder**, **à retirer**. La référence entre crochets renvoie à un audit précédent.

### A. Corriger et noter

**D1. Deux systèmes de correction, deux présences** 🔴
- **Où** : ancien système = grille à paliers en points (`GradeForm`, `GradingSession`, page `/correct`, et l'oral version « US-92 » `OralStage` + `OralPlan`, qui l'utilise). Nouveau système = « espace de correction » en lettres (`OralSpace`, réutilisé par `RenduReview` pour les rendus ; `OpenReview` pour l'étude de cas).
- **Ce qui se recoupe** : les deux notent la même copie. La présence est rangée à deux endroits : sur la copie (`attendance` de la note et des personnes) et dans l'espace de l'oral (champ `attendance` de la ligne d'espace, `oral-space-server.ts` l. 180-201). L'un réécrit l'autre au moment d'« écrire la note ». C'est ton exemple Danh.
- **Garder** : l'espace en lettres, pour tous les types qui ont une grille (oral, rendu, étude de cas, puis point d'étape s'il reste noté). **Une seule présence**, celle de la copie : l'espace la lit et l'écrit, il n'en garde pas de copie.
- **Retirer** : `GradeForm`, `GradingSession`, `OralStage` et `OralPlan` dès que le dernier type qui s'en sert est passé à l'espace en lettres. Garder l'ordre de passage et le chrono, mais dans l'espace de l'oral. La page `/correct` ouvre l'espace du bon type ; elle ne garde pas sa propre grille.
- Déjà vu : [corriger-et-noter, a-coder-2026-11-09 §1] présences « À poser » ; mémoire projet « Danh ».

**D2. « Comparer un critère » et la vue « Par critère »** 🔴
- **Où** : page `/compare` (`CriterionComparison`, en points, touches 1 à 4) ; vue « Un critère pour toute la classe » de `GradingSession` ; vue « Par critère » de l'écran Rendu (lettres, « Vérifier mes écarts ») ; vue « Par question » de l'étude de cas.
- **Ce qui se recoupe** : quatre façons de corriger un critère pour toute la classe, deux en points, deux en lettres.
- **Garder** : la vue « Par critère » de l'espace en lettres, avec le tri et « Vérifier mes écarts ». La vue « Par question » de l'étude de cas reste, car elle sert à autre chose : relire une même question.
- **Retirer** : la page `/compare` (elle redirige vers la vue « Par critère »), et la vue critère de `GradingSession`.
- Déjà vu : [corriger-et-noter/prompt-exigence-ux-correction.md §1-2]. Le fil qui code ne doit pas le faire deux fois.

**D3. « Faire passer l'oral » et « Corriger » sur la même évaluation** 🟠
- **Où** : en-tête de la page d'une évaluation orale. Les deux boutons sont violets.
- **Ce qui se recoupe** : les deux ouvrent une correction de la même copie.
- **Garder** : un seul bouton principal par type. Pour un oral, ce sera « Faire passer l'oral », avant comme après. Il ouvre l'espace qui sert aussi à corriger.
- **Retirer** : « Corriger » sur un oral.
- Déjà vu : [ux-ui-commun T2] deux boutons principaux côte à côte.

**D4. Le QCM se relit à deux endroits** 🟠
- **Où** : « Suivi du QCM > Relire la copie » (`quiz/attempts/[id]`) et la page de correction de l'évaluation (`QcmAnswersPanel`, en lecture seule, qui dit lui-même « la relecture se fait dans le suivi du QCM »).
- **Garder** : la relecture dans le suivi du QCM.
- **Retirer** : la grille de correction d'un QCM. « Corriger » sur un QCM mène au suivi.
- Déjà vu : [corriger-et-noter/prompt-claude-code.md §4], pas encore traité.

**D5. « Envoyer les résultats » deux fois sur la même page** 🟡
- **Où** : page d'une évaluation, bandeau « Tout est corrigé : envoyer les résultats » en haut, et bloc « Envoyer les résultats » en bas (l. 582 et 1268).
- **Garder** : le bandeau du haut, affiché quand c'est le moment.
- **Retirer** : le bloc du bas.

**D6. Deux blocs « Rendus » sur la même page** 🟠
- **Où** : page d'une évaluation : « Rendus — … » (`Submissions`, table `project_submission`) puis « Rendus déposés » (`SubmissionItems`, table `submission_item`).
- **Ce qui se recoupe** : deux listes de ce que les groupes ont rendu, venant de deux tables.
- **Garder** : « Rendus déposés ».
- **Retirer** : le bloc `Submissions`, après avoir recopié les anciens rendus dans `submission_item`.
- Déjà vu : [schema-bdd C, lot 6] deux tables de rendus.

**D7. La page d'une évaluation existe en deux versions** 🟠
- **Où** : `assessments/[assessmentId]/page.tsx` (57 Ko) a une mise en page pour la note de groupe et une autre pour la note individuelle. Résultat : « Grille de correction » ×2, « Ce que voient les étudiant·es » ×2, « Le jour J » ×2 (bloc du haut et encadré à droite), « Phrases » ×3, « Modifier » ×5.
- **Garder** : une seule mise en page, avec les blocs qui varient selon le type.
- **Retirer** : les blocs répétés. Cela règle en partie le problème des « 12 écrans à 125 % ».
- Déjà vu : [ux-ui-commun 8.2 point 3 et 9.3] une seule source par information.

**D8. Trois banques de « Phrases »** 🟡
- **Où** : Évaluations > Phrases (`/assessments/comments`) ; page « phrases » d'une évaluation ; banque insérée pendant la correction (`PhraseBank`) ; Réglages > phrases d'appréciation (`PhraseManager`) ; lien « Phrases » depuis la Bibliothèque.
- **Garder** : une seule page « Phrases » dans la Bibliothèque, avec un filtre « correction / appréciation ». La banque reste insérable pendant la correction et dans l'appréciation.
- **Retirer** : la section de Réglages, la page « phrases » d'une évaluation, et le lien depuis l'en-tête de la liste des évaluations.

**D9. Grilles : deux entrées** 🟡
- **Où** : en-tête d'Évaluations (liste globale) et Bibliothèque.
- **Garder** : la Bibliothèque, car une grille sert à plusieurs modules.
- **Retirer** : le bouton dans l'en-tête d'Évaluations.

**D10. Les moyennes à cinq endroits** 🟡
- **Où** : tableau « Moyennes » de la page Évaluations du module ; « Le bilan » sur Où j'en suis ; base de l'appréciation ; fiche étudiant·e ; Résultats.
- **Garder** : le tableau des Évaluations du module, et la moyenne dans la fiche étudiant·e et dans l'appréciation (elle sert à écrire).
- **Retirer** : la moyenne de « Le bilan ».
- Vérifier : les cinq doivent sortir du **même calcul** (`module-notes.ts`). [schema-bdd A1] coefficient.

**D11. Le compteur de notes à cinq endroits** 🟡
- **Où** : pastille de l'en-tête du module (« Prévues 5/2 · Notées 1/2 ») ; « Le module en chiffres » (« Évaluations prévues ») ; page Étudiant·es et groupes (« 1/2 notes requises obtenues ») ; page Évaluations ; colonne de gauche d'« Ajouter une évaluation ».
- **Garder** : la pastille de l'en-tête, et la page Évaluations.
- **Retirer** : le bloc « Évaluations » de la page Étudiant·es et groupes (avec ses boutons « Projet fil rouge » et « Voir les évaluations »), la ligne de « Le module en chiffres », et la liste de gauche d'« Ajouter une évaluation » (qui répète la page Évaluations).
- Déjà vu : [preparer-evaluations 3] trois chiffres différents.

### B. Suivre son module

**D12. Trois calculs de « ce qu'il reste à faire »** 🔴
- **Où** : `lib/ynov/module-steps.ts` (Où j'en suis, bouton « Prochaine étape », liste des modules) ; `lib/dashboard/todo.ts` (« À faire » du tableau de bord) ; `lib/modules/finish.ts` (liste « Terminer le module »).
- **Ce qui se recoupe** : trois listes de tâches pour le même module, calculées chacune à sa façon. Elles se contredisent. Exemple : le tableau de bord dit « Envoyer la progression, en retard de 18 j » quand la liste des modules dit « Prévoir les évaluations ». « Terminer » oublie les appréciations, alors qu'Où j'en suis les compte.
- **Garder** : `module-steps.ts` comme seule source. Le tableau de bord prend la prochaine étape de chaque module, plus les tâches qui ne sont pas des étapes (séance à préparer, copies à corriger). « Terminer le module » affiche les étapes pas faites.
- **Retirer** : le calcul propre de `todo.ts` pour la progression, les appréciations, les rattrapages et la facture, ainsi que la liste propre de `finish.ts`.
- Déjà vu : [ux-ui-commun 9 #44], [terminer-et-facturer T2, T4, T5].

**D13. La prochaine étape est dite trois fois sur « Où j'en suis »** 🟡
- **Où** : bouton « Prochaine étape : … » de l'en-tête ; grande carte (`JourneyHero`) ; pastille « Prochaine étape » dans la liste des étapes.
- **Garder** : la liste numérotée, avec l'étape courante en évidence et son bouton. Sur les autres pages du module, le bouton d'en-tête reste.
- **Retirer** : la grande carte, et le bouton d'en-tête sur Où j'en suis.
- Déjà vu : [ux-ui-commun 9 #43].

**D14. Les évaluations à venir, deux fois sur Où j'en suis** 🟡
- **Où** : carte « Évaluations à venir » (`UpcomingAssessmentsCard`) puis carte « À venir » qui les liste à nouveau ; carte « Les évaluations » avec « Ouvrir les évaluations », qui fait doublon avec le menu.
- **Garder** : la carte « À venir » (prochaine séance, évaluations, échéance de la progression).
- **Retirer** : `UpcomingAssessmentsCard` sur cette page et la carte « Les évaluations ».

**D15. Jalons, point d'étape, jalon du fil rouge, phases** 🔴
- **Où** : bouton « Jalons » en tête du module, puis page Jalons (table `checkpoint`, non noté) ; type d'évaluation « point d'étape » ; case « Jalon du projet fil rouge » dans une évaluation ; « phases » du projet (les 21 « phases » du brief, que tu as qualifiées de bruit) ; ligne « Jalons du projet : 1 » sur Évaluations.
- **Ce qui se recoupe** : quatre façons de dire « une étape du projet où les groupes montrent où ils en sont ». Marie veut des points d'étape **non notés**.
- **Garder** : une seule notion, **« Point d'étape »**, non notée, rangée dans le projet fil rouge. Elle a une date, la liste de qui a rendu quoi et un retour. C'est ce que fait la page Jalons aujourd'hui.
- **Retirer** : le bouton « Jalons » de l'en-tête du module (la page passe sous Projet fil rouge), la case « Jalon du projet fil rouge » sur une évaluation notée, et les phases. Le type d'évaluation « point d'étape » est retiré s'il reste non noté.
- Déjà vu : [ux-ui-commun #30], [preparer-evaluations-v2] phrase sur les jalons, mémoire « 21 phases = bruit », [corriger-et-noter/prompt-point-etape.md]. À rapprocher avant de coder ce dernier prompt.

**D16. Terminer, ranger, archiver** 🟠
- **Où** : page « Terminer le module » (« Ranger le module ») ; bouton « Terminer » de la liste des modules (qui saute la liste de contrôle) ; « Archiver le module » dans Documents ; « Tu peux l'archiver » dans Facture ; onglets « Terminés » et « Rangés ».
- **Garder** : un seul geste, **« Terminer le module »**, sur la page du même nom, atteinte par la dernière étape d'Où j'en suis. Un module terminé est archivé : un seul onglet « Terminés », avec « Rouvrir ».
- **Retirer** : « Archiver » dans Documents et dans Facture, et « Terminer » dans la liste des modules.
- Déjà vu : [terminer-et-facturer T3, T9].

**D17. Supprimer et dupliquer le module** 🟠
- **Où** : « Supprimer » à trois endroits (« Zone sensible » en bas d'Où j'en suis, Documents > Actions, menu « Plus d'actions » de la liste). « Dupliquer pour l'année » est dans Documents > Actions. Il y a trois autres reprises : « Importer des séances d'un autre module », « Partir d'un projet existant », « Reprendre une évaluation d'un autre module ».
- **Garder** : « Supprimer » et « Dupliquer » une seule fois, en bas de « Modifier le module ». Les reprises partielles (séances, projet, évaluation) restent : elles servent quand on ne veut qu'un morceau.
- **Retirer** : la « Zone sensible » d'Où j'en suis, la section « Actions » de Documents, et « Supprimer » dans la liste.
- Note : la mémoire du projet dit « No duplicate-module feature exists » ; elle est périmée, je la corrige.

**D18. « Ton retour » écrit à trois endroits** 🟡
- **Où** : fenêtre « Terminer » de la liste (« Ce que je retiens ») ; page Terminer (« Ton retour, pour toi seule ») ; carte « Ton retour » d'Où j'en suis. On y ajoute le « ce que je retiens » de chaque séance, recopié dans Documents > Actions.
- **Garder** : la page Terminer pour écrire. Sur Où j'en suis d'un module terminé, le texte est affiché en lecture seule.
- **Retirer** : la saisie dans la liste et dans la carte d'Où j'en suis.

**D19. Documents administratifs et facture déposée, deux fois chacun** 🟡
- **Où** : la liste « Documents administratifs » (Hyperplanning, Moodle…) est affichée dans Documents **et** dans Facture (`AdminDocsChecklist` sur les deux pages). La facture faite ailleurs se dépose dans Facture **et** dans Documents.
- **Garder** : les cases Hyperplanning et Moodle dans « Terminer le module », où Marie en a besoin. La facture PDF dans Facture.
- **Retirer** : la liste dans Documents et dans Facture ; le dépôt de facture dans Documents ; le bloc « Facturation » de Documents, qui ne fait que renvoyer vers Facture.
- Déjà vu : [terminer-et-facturer T12, T17].

**D20. Facturation : trois entrées** 🟡
- **Où** : Facture du module (menu du module) ; Facturation (toutes les factures, hors menu, atteinte par le bas de la liste des modules) ; Documents > Facturation.
- **Garder** : Facture du module, et Facturation pour le suivi de l'année, en version courte [terminer-et-facturer T11].
- **Retirer** : le renvoi de Documents (D19).

### C. Préparer et faire cours

**D21. Quatre façons de créer des séances** 🟠
- **Où** : assistant « Nouveau module » (étape Planning) ; « Ajouter des séances depuis un planning » (`/schedule`) ; « Ajouter une séance » ; « Importer des séances d'un autre module ». La page « Construire les séances » (`/build`) ne fait plus que rediriger.
- **Garder** : l'import du planning Hyperplanning comme **un seul** composant, utilisé dans l'assistant et depuis Séances. Garder aussi « Ajouter une séance » et « Importer d'un autre module ».
- **Retirer** : le second formulaire de planning (`ScheduleForm` s'il diffère de l'étape de l'assistant) et la route `/build`. Aujourd'hui, Où j'en suis et Attendus envoient vers `/schedule`.

**D22. Planning, frise et tableau séances × évaluations** 🟡
- **Où** : « Le planning du module » (`/planning`, l'agenda heure par heure, hors menu, atteint seulement depuis la frise) ; « Frise du module » (Espace étudiant·es) ; tableau « Ce que tu enseignes » séances × évaluations sur Évaluations ; « Couverture ».
- **Garder** : la frise, qui est aussi ce que voient les étudiant·es, et le tableau des Évaluations, qui sert à placer les épreuves. **Garder aussi le Planning** : Marie s'en sert au début, quand elle prépare son module (réponse d'Arnaud du 9/11, 15 h 28).
- **Retirer** : rien ici. Le Planning doit en revanche **être retravaillé** pour servir vraiment pendant la préparation, et avoir une vraie entrée : depuis Séances et depuis l'étape « Construire les séances » d'Où j'en suis, plutôt que seulement depuis la frise. À cadrer avec Marie : ce qu'elle veut y voir et y faire (déplacer un bloc, voir les évaluations sur la journée, repérer une séance vide…).

**D23. Aller d'une séance à l'autre : cinq chemins** 🟡
- **Où** : liste des séances à gauche ; « ← Séance N » et « Séance N+1 → » en haut ; « Séance suivante → » en bas ; « ← Retour au module » en bas ; fil d'Ariane.
- **Garder** : la liste à gauche, les deux flèches du haut, et le fil d'Ariane.
- **Retirer** : les deux boutons du bas.
- Déjà vu : [ux-ui-commun T3, #31].

**D24. Lancer le cours** 🟠 (à vérifier en prod)
- **Où** : sur la séance, « Faire cours » (`/start`) et « Carnet » (`/notebook`) ; dans `/start`, « Ouvrir ma vue privée » et « Commencer le cours » [faire-cours, prompt §?] ; sur le tableau de bord, un bouton vers `/start` et un vers `/notebook`.
- **Garder** : un seul bouton « Faire cours », qui ouvre la fenêtre projetée et la vue privée (le carnet est dans la vue privée).
- **Retirer** : le bouton « Carnet » sur la séance et sur le tableau de bord, une fois la séance clôturée. Après la clôture, il devient « Modifier la clôture ». « Ouvrir ma vue privée » est fusionné avec « Commencer ».
- Déjà vu : [faire-cours/prompt-claude-code-corrections.md] « Supprimer le doublon ». À vérifier en prod : est-ce fait ?

**D25. Exports Moodle sur chaque séance** 🟡
- **Où** : en bas de **chaque** séance : cours en PDF (un ou plusieurs), « Toutes les évaluations (zip) », « Progression pédagogique (PDF) ». La progression se télécharge aussi depuis la page Progression.
- **Garder** : ces exports une seule fois, dans Documents (« Pour Moodle »).
- **Retirer** : le bloc de chaque séance, et le second bouton de progression.

**D26. Six sortes de QCM** 🟠
- **Où** : « Quiz de fin de séance » (questions liées aux ressources, sur la séance) ; QCM projeté à l'oral (diapos `qcm-deck`) ; ressource « mini-QCM » de la Bibliothèque (famille « quizzes ») ; « QCM en ligne » (évaluation notée) ; « Générer un QCM » à partir de la banque (`quiz/generate`) ; QCM en classe par QR code. Les questions vivent à deux endroits : la Banque de questions, et les mini-QCM de la Bibliothèque.
- **Ce que fait Marie** : un QCM à l'oral en fin de théorie ; un QCM en direct type Kahoot (son idée prioritaire) ; des QCM notés rares.
- **Garder** : **une** banque de questions. Deux usages : « QCM de fin de séance » (projeté ou en direct par QR, non noté) et « QCM noté » (une évaluation). Pour créer un QCM noté, une seule entrée : « Ajouter une évaluation > QCM ».
- **Retirer** : la famille « mini-QCM » de la Bibliothèque (ses questions passent dans la banque), la page « Générer » si elle fait la même chose que la création de l'évaluation, et les liens de QCM personnels (D28).

### D. Attendus, ressources et progression

**D27. Les attendus sur six écrans** 🟠
- **Où** : « Attendus de l'école » (`/expectations`, avec « Mes attendus » et « Découper les attendus trop longs ») ; « Rapprocher les ressources » (`/matching`) ; « Couverture » (`/couverture`) ; « Attendus traités » sur chaque séance ; « Attendus évalués » sur chaque évaluation ; contrôles de la Progression ; ligne « Attendus couverts » sur Où j'en suis.
- **Garder** : une page **Attendus** qui montre, pour chaque attendu, les séances et évaluations qui le traitent, et permet de les lier. C'est la page Couverture actuelle, fusionnée avec la liste des attendus. On garde aussi les deux sélecteurs, sur la séance et sur l'évaluation.
- **Retirer** : la page Couverture, qui devient la page Attendus. Retirer aussi l'étape « Rapprocher les ressources » d'Où j'en suis : les suggestions de ressources passent dans le sélecteur de la séance.
- Déjà vu : [progression-pedagogique 1 et 5] trois écrans qui se renvoient la balle ; mémoire « attendus en double à fusionner ».

**D28 (ressources). « Retenue », « utilisée », « liée », « déroulé »** 🟠
- **Où** : « Ressources retenues du module » (sur chaque séance, et sur Séances vide) ; « Ajouter au module » dans la Bibliothèque ; « Utilisée dans N modules » ; ressources du déroulé.
- **Garder** : une ressource est **dans le déroulé d'une séance**. C'est tout.
- **Retirer** : la notion « retenue » (`RetainedResources`, `/retained`) et « Ajouter au module ». Dans la Bibliothèque, on garde « Ajouter à une séance… ».
- Déjà vu : [preparer-contenu-cours 1 point 3].

### E. Étudiant·es et espace étudiant

**D29. Cinq sortes de liens pour les étudiant·es** 🔴
- **Où** : lien de la classe (`/module/[jeton]`) ; espace perso (`/espace/[jeton]`, qui contient déjà les cours, le QCM, les rendus et les notes) ; lien de résultats (`/resultats/[jeton]`, créé par « Envoyer les résultats ») ; lien de QCM perso (`/q/[jeton]`, page « Liens » du QCM) ; QR du QCM en classe (`/q/classe/[jeton]`).
- **Ce qui se recoupe** : l'espace perso fait déjà tout ce que font le lien de résultats et le lien de QCM. Le lien de la classe montre presque la même chose que l'espace, sans les notes [test-espace R6].
- **Garder** : **l'espace perso**, un lien par personne, envoyé une fois en début de module, et **le QR en classe** pour le QCM en direct.
- **Retirer** : le lien de résultats (« Envoyer les résultats » publie dans l'espace) et le lien de QCM perso (le QCM s'ouvre dans l'espace). Ces liens déjà donnés redirigent vers l'espace de la personne quand elle en a un.
- **Lien de la classe** : les étudiant·es de SCRUM l'ont reçu (réponse d'Arnaud). Il continue donc de marcher tel quel pour les modules où il a été créé. On n'en crée plus de nouveau : le bouton disparaît, et les modules suivants n'ont que l'espace perso.

**D30. Créer un lien perso : quatre endroits** 🟡
- **Où** : Espace étudiant·es (`StudentLinksPanel`) ; fiche étudiant·e (`StudentSpaceCard`) ; Envoyer les résultats (`PublishResults`) ; Liens du QCM (`quiz/links`).
- **Garder** : Espace étudiant·es. La fiche étudiant·e garde « Nouveau lien » pour la personne qui a perdu le sien.
- **Retirer** : les deux autres, conséquence de D29.

**D31. Aperçus côté étudiant·e : trois** 🟡
- **Où** : « Voir comme un·e étudiant·e » (`/apercu`) ; aperçu des résultats (`results/preview`) ; essai du QCM (`quiz/essai`).
- **Garder** : « Voir comme un·e étudiant·e », qui montre l'espace entier, résultats compris. « Essayer le QCM » reste, car il sert à vérifier le tirage.
- **Retirer** : l'aperçu des résultats.

**D32. Étudiant·es : deux menus, quatre façons d'en ajouter** 🟡
- **Où** : « Étudiant·es » du menu principal et « Étudiant·es et groupes » du module [suivi-appreciations P15]. Pour ajouter : `/students/import` (global, même depuis un module), `/students/new`, l'assistant de groupes qui propose toute la base, et l'ajout dans un groupe. Pour les groupes : « Constituer les groupes » (assistant) et « Nouveau groupe ».
- **Garder** : l'import depuis le module (qui inscrit au module), « Ajouter une personne » depuis le module, et l'assistant pour les groupes, qui sert aussi à corriger à la main.
- **Retirer** : « Nouveau groupe » comme écran séparé (il devient un bouton de l'assistant), et l'accès à l'import global depuis un module.
- Déjà vu : [mise-en-place-classe 3 #2 et suivants].

**D33. Les observations à quatre endroits, avec trois noms** 🟡
- **Où** : Carnet de la séance (on écrit) ; « Vue de classe » sur Étudiant·es et groupes ; fiche étudiant·e ; base de l'appréciation. Les noms : « Carnet », « Journal d'observations », « Observations de cours ».
- **Garder** : écrire dans le Carnet ; relire dans la fiche étudiant·e et dans l'appréciation. Un seul mot : « Observations ».
- **Retirer** : la « Vue de classe » de la page des groupes. Elle passe dans Appréciations, où elle sert.
- Déjà vu : [ux-ui-commun T8].

**D34. La présence à trois endroits** 🟠
- **Où** : Edusign (le vrai relevé de Marie) ; étiquette « Absent·e ou retard » dans le Carnet ; présence sur chaque copie d'évaluation ; présence de l'espace de l'oral (D1). La fiche étudiant·e a une section « Présence ».
- **Garder** : la présence **à une évaluation**, sur la copie, parce qu'elle change la note (règle YNOV). Edusign pour le reste.
- **Retirer** : l'étiquette « Absent·e ou retard » du Carnet. C'est confirmé : Marie note les absences dans Edusign, sauf aux évaluations. Retirer aussi la présence de l'espace de l'oral (D1).
- Déjà vu : [suivi-appreciations 2, question 10.3].

### F. Se repérer dans l'appli

**D35. Évaluations : liste globale, « À corriger » et liste du module** 🟡
- **Où** : menu « Évaluations » (toutes, filtre « À noter ») ; carte « À corriger » du tableau de bord ; « Évaluations » de chaque module.
- **Garder** : les trois, car elles répondent à trois questions (tout voir, quoi corriger ce matin, ce module). On retire seulement ce qui fait doublon dans la liste globale : les boutons Grilles et Phrases (D8, D9), et le filtre « À noter » qui répète « À corriger ».
- Note : le menu « Évaluations » a été ajouté à la demande d'un audit précédent [corriger-et-noter v2]. Je ne propose pas de le retirer.

**D36. Le bas de la liste des modules répète le menu** 🟡
- **Où** : boutons « ← Aujourd'hui », « Évaluations », « Facturation » en bas de Modules.
- **Garder** : « Facturation », qui n'est pas dans le menu, sous la forme d'un onglet ou filtre « À facturer » en haut de la liste.
- **Retirer** : les deux autres boutons.

**D37. Les retours en double** 🟡
- Fil d'Ariane, plus « ← Retour au module » en haut, plus un autre en bas, sur Planning, Couverture, Progression, Frise, Terminer, Séance… Appréciations revient vers Évaluations alors que son menu est « Étudiant·es et groupes ».
- Déjà vu : [ux-ui-commun T3, prompt UX §7 et §31]. Je ne le redétaille pas.

**D38. Le tableau de bord se répète** 🟡
- **Où** : tuile « À faire » (un nombre) et carte « À faire » (la liste) ; carte « Évaluations à venir » et tuiles de « Cette semaine » ; carte « Tes modules en cours » et menu Modules ; « Reprendre ».
- **Garder** : « À faire » (la liste), « À corriger », « Cette semaine » (évaluations comprises) et « Reprendre ».
- **Retirer** : la tuile « À faire », la carte « Évaluations à venir » (elles passent dans « Cette semaine »), et « Tes modules en cours ».

## 4. Code mort (rien à voir pour Marie, mais à retirer)

Aucun de ces fichiers n'est importé, dans ce que j'ai pu lire. Le fil qui code vérifie avec une recherche dans tout le dépôt avant de supprimer.
- `lib/ynov/next-step.ts`. Un commentaire dit que la Facturation s'en sert, mais aucun fichier ne l'importe.
- `lib/modules/completion.ts`.
- Composants : `modules/course-list.tsx`, `modules/expectations-summary.tsx`, `modules/schedule-editor.tsx`, `students/group-members.tsx`, `modules/resource-picker.tsx`. Ils sont peut-être importés par une page profonde que je n'ai pas lue.
- Route `/modules/[id]/build`, qui ne fait que rediriger.

## 5. Ordre proposé

| Lot | Contenu | Pourquoi d'abord |
|---|---|---|
| 1 | D1 (une seule présence), D2, D6 | Des notes réelles peuvent être faussées |
| 2 | D3, D4, D5, D7, D10, D11 | Corriger devient un seul chemin par type d'évaluation |
| 3 | D12, D13, D14, D16, D17, D18, D19, D20 | Un seul « ce qu'il reste à faire », un seul « terminer » |
| 4 | D15 | Jalons et points d'étape : à rapprocher du prompt « point d'étape » avant de coder |
| 5 | D29, D30, D31 | Un seul lien par étudiant·e. Les liens déjà donnés doivent continuer de marcher |
| 6 | D21 à D28 | Séances, QCM, attendus, ressources |
| 7 | D8, D9, D32 à D38, code mort | Navigation et nettoyage |

C'est à faire **après les correctifs de parcours en cours, et avant le lot UX/UI** : sinon, on restylerait des écrans qu'on va retirer.

## 6. Réponses d'Arnaud (9 novembre, 15 h 28)

1. **Vue Planning** : Marie s'en sert au début, quand elle prépare son module, et elle est à retravailler pour être vraiment utilisable. → On la garde, et on la retravaille (D22).
2. **Absences** : Edusign, sauf pendant les évaluations. → On retire l'étiquette du Carnet, et la présence ne reste que sur la copie d'une évaluation (D34).
3. **Lien de la classe sur SCRUM** : oui, ils l'ont reçu. → Les liens existants continuent de marcher, mais on n'en crée plus de nouveaux (D29).
