# Prompt — test visuel des diapos (Claude web avec navigateur)

À coller tel quel dans Claude web (navigateur + captures d'écran activés). Tu te connectes toi-même
dans le navigateur ; ne colle jamais le mot de passe dans le prompt.

---

## Prompt

Tu es spécialiste en design de présentations pédagogiques et en accessibilité (RGAA 4.1). Tu testes
**visuellement** les diapos projetées aux étudiant·es d'une application web de cours (module Agile &
Scrum, étudiant·es de B2/B3 informatique). Des étudiant·es ont dit : « l'enchaînement n'était pas
ouf », « certaines slides ne font qu'un mot ». Je veux un rapport factuel, illustré de captures, puis
des idées d'amélioration.

### Accès

1. Ouvre https://mg-cours.vercel.app et connecte-toi (page de connexion : je te donne la main si
   besoin, demande-moi de saisir le mot de passe).
2. Tu es en LECTURE SEULE : ne modifie, n'enregistre et ne supprime rien. Ne clique sur aucun bouton
   d'enregistrement, de publication ou de suppression.
3. Les diapos se projettent depuis la page d'une séance : Modules → module « Agile & Scrum » →
   une séance → bouton « Présenter » (URL du type `/present/modules/<id>/courses/<id>`). Une fiche
   seule se projette aussi (`/present/resources/<id>`).

### Commandes de la projection

`→` / `←` ou espace : diapo suivante / précédente · `Début` / `Fin` · `s` sommaire · `d` bascule
mode diapos / document · `+` / `-` taille du texte · `f` plein écran.

### Tailles d'écran à tester

- 1920×1080 (vidéoprojecteur).
- 1366×768 (portable de l'enseignante : elle projette une fenêtre).
- 1366×768 avec `+` appuyé deux fois (texte agrandi), pour voir ce qui déborde.

### Parcours (séances S1 à S5)

Pour **chaque séance**, parcours TOUTES les diapos dans l'ordre, sans en sauter. Pour chacune, note :

- n° de diapo / total, titre, fiche d'origine (visible dans le sommaire `s`) ;
- nombre de mots approximatif et nombre de lignes ;
- type : titre seul · texte · liste · tableau · image · code · QCM · couverture · transition ;
- problèmes : texte coupé ou qui déborde, défilement nécessaire, diapo quasi vide (≤ 6 mots hors
  image), diapo surchargée (> 60 mots ou > 9 lignes), titre répété d'une diapo à l'autre, rappel de
  section en petit peu lisible, image trop petite, tableau illisible, code coupé en tranches
  (« suite 2/3 »).

Prends une capture pour : chaque diapo problématique, la première et la dernière diapo de chaque
fiche, une diapo représentative de chaque type, et chaque diapo qui change de fiche.

### Ce que je veux mesurer (composition)

1. **Enchaînement** : pour chaque fiche, l'ordre est-il objectif → notion → exemple → exercice →
   bilan ? Y a-t-il un plan au début, un bilan à la fin, des diapos de transition entre fiches ?
   Repère les ruptures (on passe d'un sujet à un autre sans lien, concept utilisé avant d'être
   défini, exemple sans règle, liste de définitions à la suite).
2. **Densité** : pour chaque fiche, nombre de diapos, mots par diapo (min / médiane / max), diapos
   par minute si la durée de la séance est indiquée. Signale les fiches projetées en rafale
   (> 2 diapos par minute) ou interminables (> 40 diapos).
3. **Diapos d'un mot** : liste exhaustive (n°, texte, ce qui manque autour : schéma, exemple ?).
4. **Hiérarchie visuelle** : le titre se distingue-t-il ? Un seul message par diapo ? Les mots-clés
   sont-ils mis en avant ? Y a-t-il trop de niveaux de listes ? La taille est-elle lisible du fond
   d'une salle (règle : ≥ 28 px équivalent à 1080p) ?
5. **Contenu qui ne devrait pas être projeté** : fiches « pour aller plus loin », corrigés, notes
   enseignante, diapos hors séance. Le sommaire les montre-t-il par défaut ?
6. **Accessibilité** : contraste visible, texte alternatif des images (survole / lis le DOM si tu
   peux), navigation clavier complète, focus visible, annonce « Diapositive n sur N », respect de
   `prefers-reduced-motion` si tu peux l'émuler, mode document (`d`) équivalent au mode diapos.
7. **Mini-QCM de fin de séance** : lisibilité, nombre de questions, cohérence avec la séance.

### Livrable

Réponds avec UN rapport en markdown, en français, structuré ainsi :

1. Résumé en 10 lignes maximum.
2. Tableau récapitulatif par séance et par fiche : nb de diapos, mots (min / médiane / max), nb de
   diapos ≤ 6 mots, nb de diapos > 60 mots, présence plan / bilan / transitions.
3. Liste des diapos problématiques : séance, fiche, n°, tailles d'écran concernées, problème, capture
   (nom de fichier ou description de la capture), correction proposée (fusionner avec la diapo
   suivante, ajouter un schéma, scinder, reformuler en phrase-titre, etc.).
4. Les 5 enchaînements les plus faibles avec le plan de réordonnancement proposé.
5. Recommandations priorisées (impact × effort) : (a) corrections de contenu, (b) règles de rendu
   (taille, densité, rappel de section), (c) idées de nouveaux types de diapos (plan, récap, schéma
   récurrent, question flash).
6. Limites de ton test (diapos non vues, séances inaccessibles, capture impossible).

N'invente rien : si tu n'as pas vu une diapo, dis-le. Cite le texte exact des diapos que tu critiques.
Ne propose pas de nouveau style graphique : le thème actuel (chouette Plume) reste.

---

## Après le test

Colle le rapport de Claude web dans la conversation Claude Code : il sera confronté à l'étude
`docs/etude-qualite-diapos.md` (mesures sur le code) pour trancher les chantiers.
