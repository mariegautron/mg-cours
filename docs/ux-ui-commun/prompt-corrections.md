# Prompt Claude Code : corrections UX/UI transverses

> Version du 9 novembre, vérifiée en prod le même jour (rapport §9).
> À lancer **après** le prompt de rebranding (`prompt-claude-code-rebranding.md`) : celui-ci pose les jetons de couleur, la typo et le composant Margot. Ce prompt-ci s'appuie dessus.
> Source : `ux-ui-commun/rapport.md` (plan priorisé, §4 et §8.3, kit de composants §5).

---

Tu travailles sur l'appli de Marie (anciennement MG COURS, renommée Marelle par le prompt précédent). La production est en ligne avec de vraies données : **ne modifie aucune donnée et ne lance aucune migration destructive**.

## Méthode

- Un commit par point, dans l'ordre des lots. Lint, types et tests avant chaque push.
- Pour chaque point qui change un comportement, écris d'abord un test qui échoue.
- Vérifie chaque écran touché à **1366 × 768**, à **1093 × 614** (1366 à 125 %, la vraie taille de Marie) et à **768 × 1024**. Côté étudiant·e, vérifie aussi à **360 × 640**.
- Ne casse rien de ce qui est listé dans « Déjà en place ».
- Marie n'utilise jamais de raccourcis clavier : toute action doit avoir un bouton visible (un raccourci peut s'ajouter, jamais remplacer).
- Elle projette en HDMI en écran étendu : ce qui part sur le projecteur (Présenter, Diapositives, frise) doit rester lisible à 1280 × 720 et ne montrer aucune donnée privée.
- À la fin, donne la liste des points faits, des points non faits avec la raison, et des captures avant/après des écrans principaux.

## Déjà en place, à ne pas casser

- Compteurs « Prévues n / N · Notées n / N ».
- Badge « Sujet : Prête / À construire », avec « Passer en Prête » en un clic.
- « Présenter le sujet » en nouvelle fenêtre et en Diapositives.
- « Étudiant·es et groupes » dans le menu du module.
- Banque de questions paginée.
- Liste des étudiant·es en haut de la vue privée en fenêtre étroite.
- Choix groupe / individuelle en haut du formulaire, coefficient automatique, liste fermée des 5 types.
- « Évaluation enregistrée » et alerte « modifications non enregistrées » sur l'évaluation et les attendus.
- « Observation ajoutée… » avec « Annuler ».
- Barre d'onglets en bas sur téléphone, menu principal à 6 entrées.
- Tableau de la couverture des attendus.
- Confirmation dans l'app avant de remplacer un dépôt.

## Lot 0 : pouvoir écrire, trouver ses copies et noter juste (P0, à faire en premier)

Quatre règles s'appliquent à **tous** les écrans, et ce lot les applique d'abord à la correction et à la page d'une évaluation (rapport §10) :
- **Place pour écrire** : tout champ où l'on rédige plus d'une phrase est une zone de texte de 4 lignes au moins, qui s'agrandit avec le texte et prend au moins 60 % de la largeur utile. Une ligne seule est réservée aux titres, liens et nombres.
- **Pas plus de 3 écrans** : l'action pour laquelle on vient sur la page est visible sans défiler ; au-delà de 3 hauteurs d'écran, on replie ou on découpe.
- **Une seule façon** d'enregistrer (automatique, avec un état visible « Enregistré à 15 h 12 ») et une seule façon d'aller à la copie suivante.
- **La page suit le type d'évaluation** : on n'affiche jamais un bloc qui n'a pas de sens pour ce type.

A. **Correction d'un groupe** (« Note du groupe ») :
   - « Un mot pour [étudiant·e] » devient une zone de texte de 3 lignes minimum, qui s'agrandit, pleine largeur.
   - Le Bilan (points forts, progrès, commentaire libre) passe sous la grille, **en pleine largeur**, plus dans une colonne de 286 px. Le total en direct reste visible dans la barre du bas.
   - La barre collée en bas ne recouvre plus rien (marge en bas de page égale à sa hauteur).
   - Les onglets de critères passent à la ligne au lieu de déborder.
   - « Pas encore noté » n'est plus une 5e tuile à côté des paliers : c'est l'état par défaut, affiché en texte.
B. **Comparer un critère** : le commentaire de chaque groupe devient une zone de texte de 3 lignes minimum, qui s'agrandit, et la colonne prend toute la place laissée par « Palier » et « À vérifier » (palier en boutons compacts à gauche, commentaire à droite sur au moins 60 % de la largeur).
C. **Oral noté en lettres** : une évaluation de type Oral se note en lettres **A, B, C, D** (A = le plus haut), avec la correspondance en points visible seulement dans « Voir le barème ». La conversion en note sur 20 reste celle de la grille. Vérifie la même chose pour toute grille marquée « en lettres ».
D. **Blocs selon le type d'évaluation** (une table de correspondance unique dans le code, testée) :
   - Oral : pas de « Rendus », « Rendus déposés », lien GitHub, étiquette, « Tout télécharger (ZIP) », « Où rendre », ni de bloc « Rendu · aucun rendu » dans la correction. À la place : « Horaires de l'oral » et l'ordre de passage.
   - Point d'étape : pas de note, pas de total, pas de moyenne.
   - QCM : pas de grille à paliers.
E. **Page d'une évaluation** : elle ne dépasse pas 3 écrans à 1366 × 768 (aujourd'hui 6 941 px pour l'oral). Les copies (« Note du groupe », « Comparer ») sont **en haut** dès que la date est passée ; les blocs de préparation (cadre, sujet, grille, attendus) sont repliés avec un sommaire. « Attendus évalués » est replié par défaut (« 3 attendus évalués · Modifier »). Remplace les 7 boutons « Enregistrer » par bloc par l'enregistrement automatique.
F. **Une seule façon d'enregistrer** dans la correction : retire « Enregistrer tout » et « Enregistrer la note » puisque tout s'enregistre ; garde un état visible et une alerte si l'enregistrement échoue.
G. **Une seule navigation** entre copies : « ← Groupe 1 · Groupe 2 · Groupe 3 → » en haut, et « Vue d'ensemble ». Retire « Aller à une copie » et « Copie précédente » en doublon.
H. **Plus d'aides clavier affichées** (« touches 1 à 4 », « ↑ ↓ », « Alt + ← / → », « Ctrl K ») : les raccourcis peuvent rester, mais ne s'affichent pas. Le bouton « Comparer un critère (touches 1 à 4) » devient « Comparer un critère ».

I. **Page d'une séance** (rapport §11 : 8 061 px à 1366, 13 800 px à 125 %, colonne de travail à 149 px) : la colonne d'édition fait au moins 560 px ; « Les 4 séances » devient un tiroir ou une liste déroulante en haut sous 1 400 px utiles ; les attendus passent sous la séance. « Ressources retenues » et « Le déroulé » sont repliés avec un résumé (« 13 étapes · 2 h », « 31 ressources · 5 affichées »). Les 5 boutons d'ajout deviennent un seul « Ajouter une séance ▾ » ; les 7 actions sous le titre deviennent 1 principale (Faire cours), 2 secondaires et « Plus ». Objectif : 3 écrans à 1366 × 768, 4 à 125 %. Les règles de densité sont posées par le prompt de rebranding (§4) : applique-les ici.

Vérification de ce lot : captures pleine page avant/après de l'oral SCRUM (page de l'évaluation, note du Groupe 1, Comparer), avec la hauteur en pixels et la taille de chaque champ de texte. **Ne tape rien dans les vraies copies** : teste l'écriture sur le module « TEST – à supprimer (essais Claude) ».

## Lot 1 : les composants communs (à créer une fois, puis utiliser partout)

1. **Statut** : un seul composant, 5 états. Chacun a sa couleur (jetons du rebranding), son icône et 1 à 3 mots :
   - pas commencé ;
   - à compléter ;
   - prêt ;
   - publié ;
   - bloquant.

   Le statut s'affiche sur une ligne, en haut à droite de la carte ou de la ligne, et il est cliquable quand l'état se change à la main. Remplace toutes les pastilles de statut existantes : cartes et pages d'évaluation, liste globale, Ajouter une évaluation, Séances, Appréciations, liens personnels, espace étudiant·e. Les infos (coefficient, « sur 20 », type de note) passent en texte gris séparé par « · », et le nom de la grille devient un lien texte.
2. **Bouton** : 4 niveaux.
   - principal : **un seul par écran ou par carte** ;
   - secondaire ;
   - discret ;
   - danger.

   Au-delà de 3 actions secondaires, on les range dans un menu « Plus ». Un bouton indisponible reste visible et grisé, avec la raison dessous. Les boutons de copie ne doivent plus avoir l'air désactivés.
3. **Message de confirmation** : en bas à droite, pendant 4 s, avec « Annuler » quand c'est possible. Il s'affiche après chaque enregistrement, publication, passage en Prête, copie ou génération.
4. **Confirmation avant une action qui ne se défait pas** : une fenêtre de l'appli, jamais celle du navigateur. Elle nomme l'objet et la conséquence. Elle s'applique à :
   - Nouveau lien, Régénérer, Retirer l'accès ;
   - Publier le QCM ;
   - Dupliquer le module ;
   - Supprimer un attendu, une séance, une évaluation ;
   - Régénérer une progression déjà envoyée.
5. **Alerte** : 3 niveaux.
   - info : gris ;
   - attention : encadré avec icône ;
   - bloquant : encadré, et l'action est empêchée ou demande une confirmation explicite.

   Une règle de tirage impossible est un cas « bloquant » : l'enregistrement est refusé. L'écart d'heures d'une séance est un cas « attention ».
6. **Barre d'actions collée en bas** pour tous les formulaires longs, sur le modèle de celle de la correction. Elle affiche l'état (« Modifié · non enregistré ») et le bouton Enregistrer. Formulaires concernés : évaluation, Modifier, grille, QCM, brief, séance, module. Elle s'accompagne d'une **alerte avant de quitter** dès qu'il reste des modifications non enregistrées, partout, rechargement compris.
7. **Retour** : un seul, « ← page parente », en haut à gauche, au-dessus du titre. Supprime les retours en bas de page et ceux en double avec le fil d'Ariane.
8. **Zone privée** : fond légèrement différent et pastille « Pour toi seule » en titre. Aucun champ privé ne doit se trouver dans un bloc « pour les étudiant·es ».

## Lot 2 : des signaux justes (P1)

9. Un statut **prêt** ou **complet** ne s'affiche que si ce qui sera publié, projeté ou imprimé est vraiment complet. Les cas à corriger :
   - le cadre « Complet » avec « ! À rendre » ;
   - « ! Où rendre » alors que le dépôt dans l'appli est réglé ;
   - la carte « Avant de générer » qui dit « Tous les attendus sont couverts » alors que le PDF dit « aucun ».
10. **Un même indicateur a la même valeur sur tous les écrans** : la couverture des attendus (Rapprocher, Couverture, Avant de générer, PDF), et les notes prévues et notées.
11. **« Prochaine étape »** :
    - elle avance quand l'étape est faite (par exemple, il y a des attendus même sans PDF de fiche déposé) ;
    - elle ne s'affiche que sur « Où j'en suis » et sur Aujourd'hui, plus en haut de toutes les pages.
12. **« Prêt pour le jour J ? »** utilise le composant Statut, avec les manques en premier. Supprime les doublons sur la page d'une évaluation : il ne reste qu'un seul « Prête · Remettre À construire ».

## Lot 3 : documents envoyés figés (P1)

13. Tout document envoyé (progression, résultats publiés, appréciations reportées) garde une **version datée à la minute**, consultable. Après « J'ai envoyé », « Régénérer » crée une nouvelle version et garde l'ancienne, avec un avertissement.
14. La page Progression a un **aperçu intégré** du PDF. Le nom du fichier contient le module, la date et l'heure. Elle affiche « générée le … à … h … ».

## Lot 4 : longueur des pages et 125 % (P1 et P2)

15. **Menu latéral** :
    - retire la grande mascotte fixée en bas (elle reste à côté du logo) ;
    - le menu défile entièrement à 125 % et à 768 px de haut (« Facture », « Avis », « Réglages » doivent rester accessibles) ;
    - affiche le nom complet du module au survol ou sur 2 lignes.
16. **En-têtes de page compacts** : le titre n'inclut plus le nom du module (il est déjà dans le fil d'Ariane), et la phrase d'aide devient repliable.
17. **Page d'une évaluation** : sections repliables avec un sommaire, et l'action du moment en haut. Avant la date, ce sont les blocs de préparation ; une fois tout corrigé, c'est « Envoyer les résultats ».
18. **Modifier la séance** : les champs exigés par l'école (objectifs, animation, évaluation, matériel) en haut, et la bibliothèque de ressources repliée et paginée.
19. **Grilles** : liste repliée (nom, critères, utilisation). Dans l'éditeur, les critères sont repliables et présentés en tableau critères × paliers, avec des libellés seulement dans l'en-tête.
20. **Pages en 3 colonnes** (Séances, Progression) : 2 colonnes, puis 1, sous 1200 px utiles. Aucun défilement horizontal, y compris les 62 px de la page Progression à 125 %.
21. **Tablette** : le menu du module ne défile plus à l'horizontale, les entrées en trop vont dans un menu « Plus ».

## Lot 5 : vocabulaire et finitions (P2 et P3)

22. **Lexique**, appliqué partout :
    - **observation** = ce que Marie note en classe ;
    - **note** = un chiffre ;
    - **commentaire** = sur une copie ;
    - **appréciation** = le texte pour Hyperplanning.

    Libellés à corriger : « onglet Administratif » devient « Documents », « Phrases » et « Nouveau commentaire » s'unifient.
23. **Typographie française** : « 1,5 pt », « 0 h 18 », accords (« 1 personne l'a consulté »), espace insécable avant « : ; ? ! ».
24. **Titres de séance par défaut** : pas de « Séance 1 · Séance 1 » au tableau de bord.
25. **Liste des modules** : un module neuf est visible tout de suite, même s'il est « À préparer ».
26. **Champs de texte** qui s'agrandissent, avec un compteur près de la limite.
27. **Espace étudiant·e sur téléphone** : onglets fixés en bas, en-tête d'une ligne, accès en double supprimés. Les paliers des grilles s'affichent en texte simple, pas en faux boutons.

## Lot 6 : constats du tour en prod du 9 novembre

28. **Tableau de bord sans modules de test** : ajoute sur chaque module une option « Masquer d'Aujourd'hui » (dans le menu ⋯ du module). Un module masqué ou rangé ne compte ni dans « Séances faites », ni dans la prochaine séance, ni dans « À corriger », ni dans « À faire ». Ne modifie pas les modules existants toi-même : Marie ou Arnaud cocheront l'option.
29. **Une seule source pour « Prochaine étape »** : Aujourd'hui, la liste des modules et Où j'en suis lisent le même calcul (aujourd'hui, Fil Rouge dit « progression en retard » d'un côté et « prévoir les évaluations » de l'autre). La pastille n'apparaît plus sur la page qui est elle-même l'étape, ni à côté de la grande carte.
30. **Jalons** : la page Jalons et la page Évaluations comptent la même chose. Si « Cadrage du produit » est un jalon, il apparaît dans Jalons ; sinon, retire « Jalons du projet : 1 ».
31. **Un en-tête de page unique** pour toutes les pages d'un module (Jalons, Couverture, Facture compris) : fil d'Ariane, titre sans le nom du module, une phrase d'aide repliable. Retire les « ← Retour au module » en double.
32. **Filtres sans doublons** : chaque module apparaît une fois, avec son année entre parenthèses quand deux modules ont le même nom.
33. **Évaluations du module** : explique l'écart « Évaluations (4) » / « Prévues 3 / 3 » (par exemple « dont 1 hors notes exigées ») ; quand tout est prévu, l'action principale devient celle de l'étape suivante, « Ajouter une évaluation » passe en secondaire ; « Sujet : » n'est lu qu'une fois.
34. **Chargement** : Modules et Bibliothèque affichent la liste en moins d'une seconde, ou au moins les titres.
35. **Page d'une évaluation, défilement trop long (remarque d'Arnaud)** : il faut descendre très loin pour atteindre le tableau des copies. Mets un sommaire en haut (Copies, Sujet, Grille, Attendus) et place le tableau des copies tout en haut dès que l'évaluation est passée ; tout le reste se replie. Voir aussi le lot 0, point E.
36. **Page d'une évaluation, « Attendus évalués » (priorité basse)** : la liste de cases à cocher prend toute la largeur et écrase la colonne voisine (un mot par ligne). Replie-la par défaut en « 3 attendus évalués · Modifier », n'affiche que les attendus cochés, et la liste complète seulement en mode modification, sans jamais réduire une colonne sous 280 px.

## RGAA (à vérifier sur chaque écran modifié)

- Contraste du texte de 4,5:1 au minimum ; contours des champs et icônes utiles à 3:1.
- Un statut n'est jamais indiqué par la couleur seule.
- Focus visible.
- Cibles de 44 px.
- Zoom à 200 % sans défilement horizontal.
- Vrais boutons, liens et libellés.
- Messages de confirmation annoncés aux lecteurs d'écran.
