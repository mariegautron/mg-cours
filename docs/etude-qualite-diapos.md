# Étude : qualité des diapos du module Agile & Scrum

Étude en lecture seule, faite le 5 novembre 2026. Rien n'a été modifié (ni base, ni code, ni BACKLOG).
Les chiffres viennent du **vrai** découpage (`buildSlides`, `src/lib/present/slides.ts`) appliqué au contenu
réel des fiches du module (base cloud, lecture seule), dans l'ordre et avec le filtre de la projection
(`studentFacing()`, plan de séance, principales d'abord).

## 1. Résumé

1. Le module projette **771 diapos** sur les séances 1 à 5 (hors mini-QCM et sujets d'évaluation), soit 34 fiches. Médiane : 32 mots par diapo, c'est sain.
2. Le problème « une diapo = un mot » existe mais il est **localisé** : 16 diapos de 3 mots ou moins hors images, 56 de 6 mots ou moins. Ce sont presque toutes des diapos « titre seul ».
3. **26 fiches sur 34** commencent par une diapo titre seul qui **répète la couverture** juste avant (le titre est affiché deux fois de suite).
4. Cause principale : le `---` placé juste après un titre `##` ferme la diapo, donc le titre part seul et son image, tableau ou schéma arrive sur la diapo suivante (« Comparer », « Le Cycle en V », « Quatre approches »).
5. Les fiches « pour aller plus loin » (secondaires, visibles étudiant·es) sont **projetées à la suite** de la séance : 152 diapos en plus (Kanban : 79). Les fiches « pour moi » sont à cacher à la main.
6. **Kanban (séance 4) est le pire cas** : 69 diapos pour 20 minutes (3,4 diapos/min, contre 0,4 à 1,2 ailleurs). C'est aussi la fiche « sur les flux » citée comme décrochage dans le retour.
7. À l'opposé, 59 diapos dépassent 60 mots (Focus sur SCRUM, Métriques agiles, User Stories) : c'est là que le retour signale des décrochages.
8. Le retour des étudiant·es est **mince** : 8 réponses, une seule parle des diapos (« je comprenais mal l'enchaînement »). La remarque « une slide = un mot » n'est dans aucune réponse du questionnaire : elle est cohérente avec les chiffres mais je ne peux pas l'attribuer à une réponse.
9. Les règles de rédaction (une idée par diapo, ~11 lignes) sont respectées ; ce qui manque, c'est le **fil** : peu de plan, pas de transition entre fiches, bilans inégaux.
10. Tout se corrige sans nouveau style : 3 changements de découpage dans `slides.ts`, un lint de diapos dans l'éditeur de fiches, et une retouche de contenu sur 6 fiches.

## 2. Comment les diapos sont produites (pipeline actuel)

| Étape | Où | Règle |
| --- | --- | --- |
| Source | table `resource`, colonne `content` (Markdown) ; `description`, `kind`, `files` | La fiche est écrite une seule fois, en Markdown. Pas de table de diapos ; `course.slides` est vide (`[]`) et `slides_url` vide pour les 6 séances |
| Parsing | `parseMarkdown` (`src/lib/pdf/markdown.ts`) | blocs : titre, paragraphe, liste, tableau, code, image, citation, encadré, `hr` |
| Découpage | `buildSlides` (`src/lib/present/slides.ts:144-208`) | `---` ferme toujours la diapo (l.181) ; chaque titre `#`, `##`, `###`… ouvre une diapo (l.184) ; image, tableau et code = diapo à part, avec le titre juste avant s'il n'y a pas de `---` entre eux (l.166-179) ; seuil `MAX_SLIDE_LINES = 11` lignes de ~70 caractères (l.18-20) ; listes coupées entre éléments, paragraphes entre phrases, code en tranches de 12 lignes |
| Rendu | `markdownSlides` (`src/components/present/deck.tsx:67-97`) | rappel du titre de section en `text-2xl` gris au-dessus quand la diapo n'ouvre pas sa section ; contenu en `size="present"` (`src/components/markdown.tsx:213` : `text-2xl`, titres `text-5xl/4xl/3xl` ligne 11, tableaux et code `text-xl`) |
| Assemblage d'une séance | `buildCourseDeck` (`src/components/present/course-deck.tsx:31-125`) | couverture, « Pour aujourd'hui, vous deviez… », « Objectifs de la séance », « Au programme » (titres des fiches), puis pour chaque fiche : couverture (`resourceSlides`, deck.tsx:100) + diapos + lien + fichiers joints, puis mini-QCM, sujets (cadre, grille), clôture |
| Affichage | `present-shell.tsx` | `<section aria-roledescription="diapositive">`, zoom 80 à 150 %, annonce « Diapositive n sur N », animation coupée si `prefers-reduced-motion` |
| Aperçu éditeur | `slidePreviews` (`src/lib/resources/paste.ts:80`) | même découpage, liste « Diapositives (N) » dans `resource-form.tsx:733` |
| Export Moodle (PDF) | `src/lib/pdf/courses.tsx` | **ne passe pas par `buildSlides`** (seuls `deck.tsx` et `paste.ts` l'appellent) : les remarques de découpage ne concernent pas les PDF |

Point notable : le mini-QCM de fin de séance, que tu avais mis de côté, **est déjà en place** (`qcm-deck.tsx`, branché dans `course-deck.tsx:90`). Il n'est pas compté ici.

## 3. Constats chiffrés

### 3.1 Volumes par séance (diapos projetées, hors QCM et sujets)

| Séance | Diapos | dont « pour aller plus loin » |
| --- | --- | --- |
| S1 | 118 | 15 |
| S2 | 144 | 0 |
| S3 | 158 | 48 |
| S4 | 211 | 79 |
| S5 | 140 | 10 |
| Total | 771 | 152 |

### 3.2 Indicateurs de découpage (toutes fiches)

| Indicateur | Valeur |
| --- | --- |
| Mots par diapo, médiane | 32 (33 hors « plus loin ») |
| Diapos ≤ 3 mots, hors images | 23 (16 hors « plus loin ») |
| Diapos ≤ 6 mots, hors images | 56 |
| Diapos ≤ 10 mots, hors images | 112 (160 avec les images) |
| Diapos « titre seul » | 59, dont **26 en première position** (doublon de couverture) et 33 intercalaires |
| Diapos > 50 mots / > 60 mots / > 80 mots | 164 / 80 / 9 |
| Diapos ≥ 10 lignes estimées | 108 (14 %) |
| Diapos image seule | 44 (texte alternatif présent sur toutes les images du Markdown) |
| Diapos tableau / code | 99 / 29 |
| Diapos sans titre propre (suite, tableau, image) | 209 (27 %), elles portent le rappel de section |
| Paragraphe d'amorce orphelin avant un code, tableau ou image | 5 (« mais plutôt : », « Par exemple : »…) |

### 3.3 Rythme : diapos par minute prévue (fiches principales chronométrées)

| Fiche | Diapos | Minutes | Diapos/min |
| --- | --- | --- | --- |
| Kanban (cœur, S4) | 69 | 20 | **3,45** |
| Quiz de rappel (S3) | 28 | 15 | 1,9 (normal : une question par diapo) |
| Gérer les imprévus client (S2) | 29 | 20 | 1,45 |
| Métriques Agile (S5) | 48 | 40 | 1,2 |
| Product Goal (S2) | 22 | 20 | 1,1 |
| Sprint Goal (S3) | 16 | 15 | 1,07 |
| Focus sur SCRUM (S2) | 42 | 40 | 1,05 |
| Estimation des tâches (S3) | 40 | 45 | 0,9 |
| User Stories & Product Backlog (S2) | 31 | 35 | 0,9 |
| Rétrospectives (S5) | 31 | 40 | 0,8 |
| Introduction GP / Grandes méthodes / Frameworks (S1) | 23 / 39 / 22 | 35 / 65 / 55 | 0,66 / 0,6 / 0,4 |

Repère courant : 1 diapo par minute ou moins pour de l'explication, davantage seulement pour des questions ou des visuels.

### 3.4 Accessibilité et lisibilité projetée

- Points solides : `<section>` avec `aria-roledescription` et libellé « n sur N : titre », annonce `aria-live`, images avec alt descriptif, mouvement réduit respecté, zoom 80 à 150 %, thème du code inchangé.
- Hiérarchie faible : la plupart des diapos s'ouvrent sur un `###` rendu en `text-3xl` (30 px) pour un corps en `text-2xl` (24 px), soit un rapport de 1,25. Le titre se détache peu en projection. Les `##` sont en 36 px, les `#` en 48 px.
- Tableaux et code en `text-xl` (20 px), plus petits que le texte courant, alors que ce sont les diapos les plus denses (tableaux de 5 à 7 lignes, jeu de données de la fiche Métriques : diapos 39-40).
- Limite : je n'ai pas mesuré les contrastes (je n'ai pas lancé l'application ni axe, par consigne) ; le gris `text-muted-foreground` du rappel de section est à vérifier sur un vidéoprojecteur, pas seulement à l'écran.

## 4. Tableau des diapos problématiques

Numéros = rang dans la fiche telle qu'elle est projetée (celle de `/present/resources/[id]` ou de la séance, couverture exclue).

### 4.1 Trop courtes ou titre seul (à fusionner avec la suite)

| Fiche (séance) | Diapos | Texte | Problème |
| --- | --- | --- | --- |
| 26 fiches (S1 à S5) | n° 1 | titre de la fiche | doublon de la couverture (`## Titre` puis `---`) |
| Les frameworks agiles (S1) | 5, 14 | « Quatre approches » (2 mots), « Comparer » (1 mot) | titre seul, l'image ou le tableau est sur la diapo suivante |
| Les grandes méthodes (S1) | 4, 15 | « La méthodologie Cascade / Waterfall », « Le Cycle en V » | idem : le titre n'accompagne pas son contenu |
| Gérer les imprévus client (S2) | 7, 13 | « Le réflexe en quatre étapes », « Les trois options » (3 mots) | idem |
| Product Goal (S2) | 5 | « Où se place-t-il ? » | idem |
| User Stories & Product Backlog (S2) | 16 | « Trois listes à ne pas confondre » | idem |
| Focus sur SCRUM (S2) | 17 | « Les rôles en détail » | intercalaire de 4 mots |
| Estimation des tâches (S3) | 1, 2, 28 | « Estimation des tâches », « Définition : estimer ≠ promettre » (5 mots), « Planifier un sprint réaliste » | trois titres seuls, dont deux d'affilée au début |
| Quiz de rappel (S3) | 3, 12, 18, 26 | « Questions » (1 mot), « Correction » (1 mot), « Quatre pièges fréquents », « Pourquoi ce rappel ? » | intercalaires ; acceptables seulement s'ils annoncent un compteur ou un enjeu |
| Métriques Agile (S5) | 1, 7 | « Métriques agiles » (2 mots), « Le parcours d'un élément » | titre seul suivi d'un schéma |
| Kanban cœur (S4) | 3, 8, 23, 37 | « 2. Comprendre le flux de travail », « 3. Le WIP »… (3 à 6 mots) | titres `#` numérotés seuls avant leur `##` |
| Kanban plus loin (S4) | 5, 11, 12, 13, 29, 33, 38, 48, 49, 56 | « 100 % d'occupation… », « mais plutôt : », « Par exemple : », « Dev = 3 / 3 » | phrase d'amorce séparée de son bloc de code, 1 à 6 mots par diapo |
| Estimation plus loin (S3) | 20, 26, 32, 38, 43 | 2 à 9 mots | titres seuls |
| Corrigé étude de cas (S5) | 1, 3, 7 | couverture + « Situation A / B » | idem |

### 4.2 Surchargées (> 60 mots ou ≥ 10 lignes)

| Fiche | Diapos | Remarque |
| --- | --- | --- |
| Focus sur SCRUM (S2) | 1, 18, 19, 21, 32, 33, 37, 42 | 8 diapos > 60 mots ; n° 21 : 88 mots (rôle du PO), n° 42 : 78 mots ; 13 diapos ≥ 10 lignes |
| Métriques Agile (S5) | 9, 10, 12, 24, 31-34, 40, 41, 47, 48 | n° 12 « Moyenne ou médiane ? » : 89 mots, n° 9 : 78 mots, les quatre « Signal n » : 54 à 62 mots chacun |
| User Stories & Product Backlog (S2) | 10, 20, 23, 30, 31 | 5 diapos > 60 mots |
| Kanban cœur (S4) | 2, 27, 30 (65, 65, 65 mots), 53, 58 | trois diapos de 11 lignes |
| Estimation des tâches (S3) | 25 | « La vélocité » : 85 mots |
| Gérer les imprévus (S2) | 27, 28 | 2 diapos > 60 mots |
| Fin de fiches | « Points clés » de Quiz (79 mots), Métriques (75), Estimation | bilans plus denses que le reste |

### 4.3 Ruptures d'enchaînement

| Où | Constat |
| --- | --- |
| Toutes les fiches | La couverture de fiche (type + titre + description) sert d'intercalaire, mais ne rappelle ni l'objectif ni le lien avec la fiche précédente. Seules 4 fiches sur 34 ont un plan (« au programme », « plan ») : Focus sur SCRUM, Estimation, Consignes du Sprint Planning |
| S1, S2 (théorie) | Chaque fiche enchaîne pourquoi, définition, détails sans exemple tôt ; l'exemple « médiathèque » arrive après la définition (User Stories : « Le format » puis « Exemple ») |
| S2, User Stories | Le vocabulaire Epic, Feature, US, Task n'a pas de diapo « du plus gros au plus petit » ; « Epic » n'apparaît que 2 fois dans toute la fiche (diapo « Du besoin aux user stories », très tard). Lien direct avec la réponse « perdu sur Epic, Feature, Task, US » |
| S4, Kanban | Deux fiches Kanban qui se recouvrent : le cœur (69 diapos, numérotées « 1. à 13. » comme un document, sans `---`) et « pour aller plus loin » (79 diapos, mêmes thèmes : WIP, Pull, anti-patterns). Le cœur n'a ni titre-assertion, ni rythme visuel (3 schémas pour 69 diapos) |
| S3 | « Quiz de rappel » : 28 diapos pour 15 minutes, avec « Quatre pièges fréquents » (7 diapos) qui est un mini-cours, pas un rappel |
| Bilan | « Points clés » seulement dans 10 fiches (titre exact), « En résumé » dans 3 ; les ateliers n'ont pas de diapo de bilan ni de retour à l'objectif |
| Titres | La plupart sont des étiquettes (« Le Sprint Goal », « Définition », « Comparer »), peu sont des assertions (« Le Sprint Goal fixe un but, pas une liste ») |

## 5. Croisement avec le retour des étudiant·es

Source : `module_feedback` (8 réponses). Je cite sans les relier à des personnes. Remarque : les réponses n° 3 et 4 sont **identiques mot pour mot** (probable double envoi), donc 7 avis distincts.

| Citation | Fiche et diapos probables | Lien avec l'étude |
| --- | --- | --- |
| « les diapositives, je comprenais mal l'enchaînement » | non précisé ; le rythme et les titres seuls pointent vers les séances 1 et 4 (S1 Frameworks : n° 5 puis 14 ; S4 Kanban cœur) | titres isolés de leurs schémas, couverture + titre redondants, pas de fil de séance |
| « J'ai été un peu perdu sur les différents termes au début : Epic, Feature, Task, US » | S2 User Stories & Product Backlog, diapos 10 à 31 | pas de hiérarchie visuelle des termes ; Epic apparaît tard |
| « Le cours sur les flux » (cité 2 fois comme ce qu'on a perdu) | S4 Kanban cœur, diapos 1 à 69 | 3,45 diapos/min, diapos de 65 mots, texte presque sans image |
| « sur la partie théorique des métriques agiles j'ai un peu décroché » | S5 Métriques Agile, diapos 9 à 12 puis 24 à 34 | 10 diapos > 60 mots, formules et définitions avant l'exemple (exemples arrivent aux diapos 11, 14, 26) |
| « pendant certaines théories » | S2 Focus sur SCRUM (42 diapos, 13 de ≥ 10 lignes), S3 Estimation | densité des diapos théoriques |
| « Un peu moins partir du principe que tout le monde connaît agile » | S1 et S2, début de séance | pas de diapo d'ouverture « d'où on part » ; recoupe ton idée de diapos d'ouverture |
| « Les TP sont très engageants », « les exercices de groupe », « les jeux de rôles » | ateliers S2, S3, S4 | à garder : l'interaction fonctionne ; les diapos de consigne sont brèves (6 à 18 diapos) |
| « C'était assez fluide, pas décroché à un moment précis » | — | un contre-exemple : le problème n'est pas général |

À noter : **aucune réponse ne mentionne « un mot par slide »**. Les 8 notes sont 4 ou 5 sur 5, le ton est positif.

## 6. Écart avec les bonnes pratiques

| Pratique | État actuel | Verdict |
| --- | --- | --- |
| Une idée par diapo | respectée dans l'ensemble (médiane 32 mots) | bon, avec 59 diapos trop denses à alléger |
| Titre-assertion | titres en étiquettes | à améliorer, par fiche |
| Règle de densité (≈ 40 à 50 mots, 6 à 8 lignes) | seuil à 11 lignes (≈ 90 mots) | trop haut pour une projection en classe |
| Fil narratif : annoncer, dérouler, résumer | plan rare, bilans inégaux | à construire |
| Diapos de transition / agenda / récap | « Au programme » (titres), pas de récap entre fiches | partiel |
| Exemple avant la définition | l'inverse la plupart du temps | à tester sur 2 ou 3 fiches |
| Interaction toutes les ~10 min | exercices et mini-QCM en place ; des blocs théoriques de 40 à 65 minutes sans pause (Grandes méthodes 65 min, Frameworks 55) | à vérifier fiche par fiche |
| Diapos d'ouverture réutilisables | non faites (la fiche « Bienvenue » existe pour S1) | à faire (voir plus bas) |
| Mini-QCM de fin | **fait** (`qcm-deck.tsx`) | à valoriser dans le fil |

## 7. Causes racines

1. **`---` après un titre** (`slides.ts:181`) : l'instruction « ferme toujours la diapo » s'applique même quand la diapo courante est un titre seul. Le titre part sans contenu. C'est la source des 33 titres seuls intercalaires dont plusieurs devraient accompagner leur image ou tableau.
2. **Couverture + titre de fiche** : `resourceSlides` ajoute une couverture (`deck.tsx:102`), puis la fiche commence elle-même par `## Titre` + `---`, d'où le doublon sur 26 fiches. Ta règle « pas de diapo Objectifs, on commence par le titre » est bien suivie, mais elle fait doublon avec la couverture qui existe déjà.
3. **Amorces séparées** : un code, tableau ou image est toujours « standalone » (`slides.ts:166-179`), donc le paragraphe qui l'introduit (« mais plutôt : ») reste seul.
4. **Seuil de densité trop permissif** : `MAX_SLIDE_LINES = 11` avec 70 caractères par ligne autorise ≈ 90 mots ; `blockLines` compte une image pour 11 lignes mais un tableau pour `lignes + 1`, sans tenir compte des cellules longues.
5. **Projection de tout ce qui est « prêt »** : `getCourseResourcesFull` (`src/lib/modules/queries.ts:186`) renvoie les fiches secondaires après les principales, et `buildCourseDeck` les projette toutes. Les « pour aller plus loin » (et le « Corrigé : étude de cas blanche » en S5) sont donc dans la projection par défaut, à cacher une par une.
6. **Une fiche écrite comme un document** : « Pratiquer Kanban » est numérotée (« 1. », « 2.1 ») sans `---` ni tronçonnage voulu, avec des diagrammes en bloc de code. C'est l'ancien format, qui n'a pas été repassé comme les fiches revues le 8 octobre.
7. **Rien ne vérifie la qualité des diapos** : l'éditeur affiche la liste des diapos (`slidePreviews`) mais ne signale ni titre seul, ni diapo trop longue, ni rythme.

## 8. Recommandations priorisées

Échelle : impact (1 faible à 3 fort) et effort (S ≤ 1 h, M ≤ 1/2 journée, L plus). Les quick wins sont marqués.

### (a) Contenu, fiche par fiche

| # | Fiche | Action précise | Impact | Effort |
| --- | --- | --- | --- | --- |
| a1 | **26 fiches** | Supprimer le `## Titre` + `---` d'ouverture (la couverture le montre déjà) ou le remplacer par une vraie diapo d'accroche (exemple concret, question) | 3 | S, quick win |
| a2 | Frameworks agiles (S1) | Retirer le `---` après « Quatre approches » (n° 5), « Comparer » (n° 14) pour que le titre accompagne l'image et le tableau suivants | 2 | S |
| a3 | Grandes méthodes (S1) | Accompagner « Cascade » (n° 4) et « Cycle en V » (n° 15) de leur schéma ; découper les blocs de 65 minutes par un exercice court toutes les ~20 minutes | 2 | M |
| a4 | **Kanban cœur (S4)** | Réécrire au format des fiches revues : 20 à 25 diapos pour 20 minutes ; fusionner les amorces avec leurs schémas (n° 10-12, 15-17, 18-20) ; remplacer les blocs de code-schéma par des schémas PNG ; garder le jeu du flux comme point d'ancrage ; renvoyer le reste à « pour aller plus loin » | 3 | L |
| a5 | Kanban plus loin (S4) | Fusionner les 32 diapos de ≤ 10 mots avec leur voisine (amorce + bloc de code = une diapo) ; viser 40 diapos au lieu de 79 | 2 | M |
| a6 | User Stories & Product Backlog (S2) | Ajouter une diapo « du plus gros au plus petit » (besoin, epic, feature, story, tâche) dès l'entrée de la fiche, avec un exemple médiathèque ; la garder en rappel ; fusionner « Trois listes à ne pas confondre » (n° 16) avec sa comparaison | 3 | M |
| a7 | Métriques Agile (S5) | Alléger n° 9, 10, 12 (> 65 mots) ; mettre l'exemple avant la définition (n° 11 avant n° 9) ; découper les quatre « Signal n » en une diapo de tableau « Observé / Cause probable / Action » ; fiche à 38 diapos environ | 3 | M |
| a8 | Focus sur SCRUM (S2) | Découper n° 21 (88 mots, rôle du PO), n° 18-19, 32-33, 37, 42 ; ajouter un plan en tête (« 5 événements, 3 rôles, 3 artefacts ») et un rappel de position (« événement 2 sur 5 ») | 2 | M |
| a9 | Estimation des tâches (S3) | Fusionner n° 1-2 (deux titres seuls), n° 28 avec sa suite ; alléger n° 25 (85 mots) ; une diapo de « bilan » existe déjà (n° 36-39), la raccourcir | 2 | S |
| a10 | Quiz de rappel (S3) | Renommer les intercalaires (« 8 questions, 10 minutes », « Réponses ») ; déplacer « Quatre pièges fréquents » dans une fiche propre ou le raccourcir | 1 | S |
| a11 | Gérer les imprévus, Product Goal, Sprint Goal (S2, S3) | Retirer le `---` après « Le réflexe en quatre étapes », « Les trois options », « Où se place-t-il ? », « Le lien avec le Product Goal » | 1 | S, quick win |
| a12 | Toutes les fiches de cours | Ajouter en tête une diapo « Dans cette fiche » (3 puces maximum) et finir sur « Points clés » ; ajouter une diapo de passage « Ce qu'on vient de voir → ce qui suit » entre deux fiches d'une même séance | 2 | M |
| a13 | Exercices (workshop) | Ajouter une diapo de bilan : « Qu'avez-vous constaté ? » avec 2 ou 3 questions | 1 | S |
| a14 | S1, début de module | Réutiliser la fiche « Bienvenue » et ajouter 2 diapos « d'où on part » (niveau supposé, ce qu'on ne suppose pas) pour répondre à « moins partir du principe que tout le monde connaît agile » | 2 | S |

### (b) Règles de rendu et de découpage dans le code

| # | Fichier : fonction | Changement | Impact | Effort |
| --- | --- | --- | --- | --- |
| b1 | `src/lib/present/slides.ts:181` `buildSlides` | Quand la diapo courante n'est qu'un titre (`headingOnly()`) et que le bloc suivant est `hr`, ne pas fermer : garder le titre pour la diapo suivante (sauf si c'est la dernière). Ajouter un test dans `slides.test.ts` | 3 | S, quick win |
| b2 | `src/components/present/deck.tsx:100` `resourceSlides` | Ignorer la première diapo du contenu si elle ne contient que le titre de la fiche (même texte que la couverture) | 3 | S, quick win |
| b3 | `slides.ts:166-179` `pushStandalone` | Rattacher le paragraphe d'amorce qui précède (≤ 15 mots, finit par « : ») au bloc code, tableau ou image qui suit | 2 | S |
| b4 | `slides.ts:18` | Passer `MAX_SLIDE_LINES` de 11 à 9 (≈ 60 mots) et compter les lignes des cellules de tableau, pas seulement le nombre de rangées (`blockLines`, l.59) | 2 | S |
| b5 | `src/components/markdown.tsx:11` `PRESENT_HEADING` | Écarter la hiérarchie : `###` passe de `text-3xl` à `text-4xl`, tableaux et code de `text-xl` à `text-2xl` si la place le permet. Même thème, mêmes tailles de zoom | 2 | S |
| b6 | `src/components/present/course-deck.tsx:84` | Ne projeter par défaut que les fiches principales (rôle `primary`) ; proposer les « plus loin » comme éléments cachés par défaut dans « Avant de commencer » (`prep-panel.tsx`), cochables. Le « Corrigé » (S5) caché par défaut aussi | 3 | M |
| b7 | `deck.tsx:99-107` couverture de fiche | Ajouter l'objectif pédagogique (`course_resource.pedagogical_objective`, existant en base) et la durée prévue sous la couverture | 2 | M |
| b8 | `course-deck.tsx` | Diapo « Au programme » avec position : afficher « 2 sur 5 » dans le rappel de chaque fiche (fil visuel) | 2 | M |

### (c) Garde-fous automatiques

Proposition : une fonction pure `lintSlides(specs, durationMinutes?)` dans `src/lib/present/slides-lint.ts` (testée), appelée par `slidePreviews` (`paste.ts:80`) pour afficher des avertissements **non bloquants** à côté de la liste « Diapositives (N) » du formulaire (`resource-form.tsx:733`), jamais dans la projection.

| Règle | Seuil proposé | Message type (tutoiement) |
| --- | --- | --- |
| Titre seul | diapo composée d'un seul titre, hors intercalaire annoncé | « La diapo 5 n'a qu'un titre : tu peux la rattacher à la suivante. » |
| Doublon couverture | première diapo = titre de la fiche | « La diapo 1 répète le titre de la fiche. » |
| Trop courte | < 4 mots, hors image, tableau, code | « Diapo de 2 mots : à fusionner ? » |
| Trop dense | > 60 mots ou > 9 lignes | « Diapo de 88 mots : à couper en deux. » |
| Rythme | diapos par minute > 1,5 (durée connue par `course_resource.duration_minutes`) | « 69 diapos pour 20 minutes : à resserrer. » |
| Fil | pas de « Points clés » ou résumé en dernière diapo ; plus de 40 diapos sans titre de section | « Pas de bilan en fin de fiche. » |
| Amorce orpheline | paragraphe ≤ 15 mots finissant par « : » suivi d'un code, tableau ou image | « Ce « mais plutôt : » est seul sur sa diapo. » |
| Alt des images | texte alternatif vide ou nom de fichier | « Image sans description. » |
| Longueur de fiche | > 50 diapos | « Fiche de 79 diapos : sépare cœur et approfondissement. » |

Ajouter un test unitaire (Vitest) qui exécute le lint sur un jeu de fiches types, plutôt qu'en CI sur la base cloud. Ces règles ne doivent pas bloquer la publication (cohérent avec « pas de règles inventées »).

### (d) Quick wins, puis chantiers

| Ordre | Action | Effort | Gain |
| --- | --- | --- | --- |
| 1 | b1 + b2 (fusion titre / suite, fin du doublon de couverture) | S | supprime environ 26 diapos redondantes et une bonne part des titres seuls, sans toucher aux fiches |
| 2 | b6 (« plus loin » et corrigés cachés par défaut) | M | retire 152 diapos de la projection par défaut, évite de projeter un corrigé |
| 3 | b3 + b4 + b5 (amorces, seuil, hiérarchie) | S à M | lisibilité immédiate |
| 4 | Lint (c) dans l'éditeur | M | empêche le retour des défauts |
| 5 | a4 et a7 (Kanban cœur, Métriques) | L | traite les deux décrochages cités |
| 6 | a6 (hiérarchie Epic / Feature / Story / Task) | M | répond à la confusion de vocabulaire |
| 7 | a12 à a14 (plan, passages, ouverture S1) | M | fil narratif |

## 9. Plan d'action en US proposées (sans modifier BACKLOG.md)

Numéros provisoires, à ajuster avec le backlog en cours.

| US | Intitulé | Contenu | Critères d'acceptation |
| --- | --- | --- | --- |
| US-A | Un titre ne reste plus seul sur sa diapo | b1 + b2 + b3 dans `slides.ts` et `deck.tsx`, tests `slides.test.ts` | un `---` après un titre ne produit plus de diapo de moins de 4 mots hors intercalaire ; plus de doublon de couverture ; 26 fiches sans diapo titre en n° 1 |
| US-B | Densité de projection | b4 + b5 (seuil 9 lignes, comptage des tableaux, hiérarchie des titres) | aucune diapo > 60 mots sur les fiches Agile, ou signalée ; pas de nouveau style ; e2e axe à 0 violation |
| US-C | Projeter l'essentiel par défaut | b6 : fiches secondaires et corrigés cachés par défaut, cochables dans « Avant de commencer » | la séance 4 passe de 211 à ~132 diapos par défaut ; la séance peut les réactiver en un clic |
| US-D | Contrôle de qualité des diapos dans l'éditeur | `lintSlides` + affichage des avertissements dans `resource-form.tsx` | 9 règles du § 8(c) testées ; avertissements annoncés (`role="status"`), non bloquants |
| US-E | Un fil par séance | b7 + b8 (objectif et position sur les couvertures de fiche, rappel « 2 sur 5 ») | chaque couverture de fiche indique objectif, durée, position |
| US-F | Repasser Kanban et Métriques au format diapos | a4, a5, a7 | Kanban cœur ≤ 25 diapos ; Métriques ≤ 40 diapos et aucune > 65 mots ; validation de Marie avant écriture en base |
| US-G | Hiérarchie du backlog et ouverture de module | a6 + a14 | diapo « du plus gros au plus petit » en début de S2 (User Stories) ; 2 diapos « d'où on part » en S1 |
| US-H | Bilans et passages | a12 + a13 | « Points clés » présent sur toutes les fiches de cours ; bilan court après chaque exercice |

## 10. Questions ouvertes pour toi

1. **Retour « une slide = un mot »** : il n'est dans aucune des 8 réponses du questionnaire. D'où vient-il (oral, autre canal) ? Sur quelles diapos, si tu t'en souviens ? Cela permet de confirmer les cibles (S1 Frameworks et S4 Kanban seraient mes premières hypothèses).
2. **Doublons du retour** : les réponses n° 3 et 4 sont identiques. Veux-tu les compter comme une seule avant l'analyse définitive ?
3. **Fiches « pour aller plus loin »** : les projettes-tu en classe, ou ne servent-elles qu'à la lecture à la maison ? Si oui, je les cache par défaut (US-C).
4. **Corrigé de l'étude de cas blanche** : il est visible des étudiant·es et projeté en fin de S5 par défaut. Est-ce voulu (corrigé projeté après l'exercice) ou à cacher par défaut ?
5. **Diapo de titre de fiche** : préfères-tu supprimer le titre répété (b2) ou le garder comme vraie diapo d'accroche avec une question ou un exemple ?
6. **Seuil de densité** : 9 lignes (≈ 60 mots) te convient-il pour la projection, sachant que tu projettes sur un vidéoprojecteur d'école ? Je ne l'ai vu que sur écran.
7. **Kanban** : veux-tu passer à un seul document pour Kanban (cœur plus bref + « plus loin » séparé) comme pour Estimation et Métriques, ou refaire les deux ?
8. **Quiz de rappel (S3)** : la consigne dit « sur papier ou … » ; vu ta règle « tout support numérique », veux-tu remplacer « papier » par une saisie dans l'app ou un message ?
9. **Pauses interactives** : les blocs de théorie de S1 (65 et 55 minutes d'affilée) sont-ils entrecoupés à l'oral ? Si non, je propose une diapo d'interaction toutes les ~10 diapos.
10. **Consignes de rédaction** : veux-tu que le lint (c) vérifie aussi l'absence du mot « neutre » et le vouvoiement, ou que ce reste de ta relecture ?

## 11. Limites de l'étude

- **Accès base** : la base locale n'est pas démarrée ; j'ai lu la base cloud en **GET seulement** (REST, clé du fichier `.env.vercel.local`) pour `course`, `course_resource`, `course_plan`, `resource` et `module_feedback`. Aucune écriture, aucun test, aucun commit.
- **Simulation** : j'ai exécuté le vrai `buildSlides` hors de l'application (sans rendu visuel ni zoom). Le plan de séance (`course_plan.resource_order`) et le filtre `studentFacing` sont reproduits ; l'option « pour moi » (`?hide=`) n'est pas appliquée ; les mini-QCM et les sujets d'évaluation ne sont pas comptés.
- **Mots** : décompte approximatif (tableaux comptés cellule par cellule, images comptées pour 1) ; la séance 6 n'a pas de fiche projetée pour les étudiant·es.
- **Retour** : 8 réponses seulement, dont 2 identiques ; aucun numéro de diapo n'y figure, les rapprochements sont des hypothèses fondées sur les chiffres.
- **Accessibilité** : revue du code (structure, alt, mouvement), pas de mesure de contraste ni d'audit axe.
