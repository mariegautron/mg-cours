# Interface de MG COURS : rapport UX/UI commun

*Rapport du 8 novembre 2026, rédigé à partir des tests des autres fils : préparer les évaluations, suivi et appréciations, espace et liens étudiant·es, vérification de la projection. J'ai aussi regardé leurs captures, et les prompts « faire cours » et « corriger et noter ». Je ne refais pas leurs parcours : je regroupe ici ce qui revient **sur plusieurs écrans**, du point de vue du visuel, des composants et de la praticité. Pas de code : chaque amélioration dit quoi changer, où, et renvoie à une capture.*

*Vue de référence : ton portable en 1366 × 768, à 100 % puis à 125 %. J'ai aussi regardé le vidéoprojecteur (1280 × 720 et 1920 × 1080) et, côté étudiant·es, le téléphone (360 × 640 et 360 × 800).*

---

## 1. En bref

1. **L'appli a déjà une vraie identité, et elle est réussie.** Thème sombre et violet lavande, grandes cartes arrondies, une typographie à forte personnalité pour les titres, et la chouette. La projection (sujet, frise, diapos) est la partie la plus aboutie. Il ne faut **pas** tout refaire, mais **mettre de l'ordre** dans les composants.
2. **Les statuts sont le premier problème visuel.** Il y a au moins 4 systèmes de pastilles différents, des couleurs qui se contredisent (« Complet » en vert à côté de « À construire »), des pastilles qui contiennent une phrase entière, et rien n'est cliquable.
3. **Trop de boutons ont le même poids**, d'autres ne ressemblent pas à des boutons, et certains semblent désactivés alors qu'ils marchent. Les actions qui comptent sont souvent **sous le pli**, parfois même sous le bouton Enregistrer.
4. **Les pages sont longues** : jusqu'à 5,8 écrans à 100 %, 9,6 écrans à 125 %, et 37 écrans pour la banque de questions. **À 125 %**, le menu latéral est coupé et la chouette cache des entrées du menu.
5. **L'appli parle peu après un clic** : souvent pas de « c'est enregistré », pas d'alerte avant de quitter une page modifiée, et des avertissements importants écrits en petit gris. Deux pertes de texte ont été constatées.

---

## 2. Ce qui marche bien, à garder tel quel

- **La projection** : sujet en cartes Quand / Avec qui / Ce que vous rendez / Comment c'est noté, très lisible en 1920 ([capture 13](../preparer-evaluations/captures/13-sujet-projete-1920x1080.png)). La frise avec la chouette qui avance est une jolie trouvaille ([frise](../verif-projection-choisir-son-sujet/captures/frise-1366.png)).
- **La barre d'actions collée en bas de la correction** (« 3 / 20 · total en direct… Enregistrer la note ») : c'est le bon modèle, à reprendre partout ([capture](../suivi-appreciations/captures/06-carnet-dans-correction-1366.png)).
- **Le tableau de bord** : quatre tuiles chiffrées, la prochaine séance mise en avant avec un liseré violet et une seule action principale ([capture 01](../preparer-evaluations/captures/01-tableau-de-bord-rien-sur-les-evaluations-1366.png)).
- **La vue privée en classe** : 2 clics pour noter, étiquettes numérotées, confirmation lisible ([capture](../suivi-appreciations/captures/01-vue-privee-noter-1366.png)).
- **La pastille « Pour toi seule »** pour ce qui est privé : claire et rassurante.
- **L'aperçu téléphone** à côté de la publication ([capture](../test-espace-liens-etudiants/captures/01-frise-marie-1366.png)).
- **Le contraste général** : texte presque blanc sur fond très sombre, et focus clavier visible (anneau violet).
- **Le QCM côté étudiant·e** : chrono, sauvegarde visible, gestion des coupures réseau.

---

## 3. Les problèmes transverses

Chaque problème donne ce que j'ai vu, les écrans touchés, une capture, puis l'amélioration proposée. Les numéros T1 à T10 sont repris dans le plan priorisé (section 4).

### T1. Statuts et pastilles : quatre systèmes qui ne se parlent pas

**Ce qu'on voit**
- **Page Évaluations du module** : des pastilles colorées sur fond teinté, avec une majuscule (« Complet » vert, « À compléter : date » jaune, « En cours (1 copie à finir) » jaune). Certaines contiennent le **nom complet d'une grille** sur 3 lignes : « Grille de notation — Jalon 1 : cadrage du produit (Agile & Scrum) » ([capture 04](../preparer-evaluations/captures/04-page-evaluations-il-te-manque-1366.png)).
- **Liste globale des Évaluations** : des pastilles grises, en minuscules, sans couleur (« à noter », « notée »). Sur une ligne longue, la pastille passe **sous** le texte au lieu de rester à droite ([capture 02](../preparer-evaluations/captures/02-liste-globale-evaluations-1366.png)).
- **Ajouter une évaluation** : « Noté » en vert, « À noter » en jaune ([capture 05](../preparer-evaluations/captures/05-ajouter-evaluation-trois-choix-1366.png)).
- **Page d'une évaluation** : « Complet » vert et « ✓ Quoi ✓ Quand… » verts, alors que juste dessous « À construire » est jaune. On croit que c'est prêt alors que ça ne l'est pas ([capture 07](../preparer-evaluations/captures/07-evaluation-complet-et-a-construire-1366.png)).
- **Pastilles d'information** neutres (« Coefficient 1 », « Sur 20 », « Note de groupe ») de la même forme que les pastilles de statut.
- **Espace étudiant·e** : « Pas noté » en pastille pleine, et des paliers « 2 pt · 1,5 pt » en pilules qui **ressemblent à des boutons** ([capture 08](../test-espace-liens-etudiants/captures/08-notes-espace-perso-360.png)).
- Le badge d'état « À construire » **n'est pas cliquable** : il faut passer par « Modifier », au milieu d'un long formulaire.

**Écrans** : Évaluations (globale et module), Ajouter une évaluation, page d'une évaluation, Appréciations, Séances (« Prête »), Espace étudiant·e (Notes, Évaluations), Liens personnels.

**Amélioration**
- **Un seul jeu de statuts**, avec la même couleur et le même mot partout :
  - **gris** = pas commencé (« À écrire », « À construire ») ;
  - **jaune** = en cours ou à compléter ;
  - **vert** = prêt ou fait (« Prête », « Notée », « Écrite ») ;
  - **violet** = publié ou visible par les étudiant·es ;
  - **rouge** = bloquant (« Trop longue », « Tirage impossible »).
- **Un statut par objet, au même endroit** (en haut à droite de la carte ou de la ligne), toujours sur une ligne.
- **Le statut global gagne** : si l'évaluation est « À construire », le cadre ne s'affiche pas en vert « Complet », mais « Cadre rempli · sujet à passer en Prête ».
- **Séparer l'information du statut** : « Coefficient 1 · Sur 20 · Note de groupe » en simple texte gris, pas en pastilles. Le nom de la grille devient un lien texte, pas une pastille.
- **Badge d'état cliquable** (menu À construire / Prête / Fournie), comme demandé par Marie.
- Côté étudiant·e : paliers en simple texte, et le palier obtenu surligné.

### T2. Boutons : trop de boutons au même niveau, d'autres qui n'en ont pas l'air

**Ce qu'on voit**
- **Cinq styles de boutons** sans règle visible :
  - violet plein, en 3 tailles (« Préparer la séance 2 » grand, « Corriger » moyen, « Créer une évaluation » petit) ;
  - contour arrondi (« Voir le module », « Corriger » au tableau de bord) ;
  - texte seul (« Modifier le brief », « Rattrapages », « Écrire », « Modifier le cadre », « Reprendre une grille existante ») ;
  - gris foncé (« Enregistrer » du cadre) ;
  - lien souligné (« Changer cette limite »).
- **Des boutons qui ont l'air désactivés** alors qu'ils marchent : « Copier pour Hyperplanning », « Tout copier », « Télécharger le CSV », en gris délavé ([captures 03 et 04](../suivi-appreciations/captures/04-ecrire-appreciation-1366.png)).
- **Une pile d'actions de même poids** : sur Séances, « Ajouter une séance », « Depuis un planning », « Depuis un autre module », « Planning du module », « Frise du module »… sont 5 pilules identiques les unes sous les autres ([capture 06, à droite](../test-espace-liens-etudiants/captures/06-marie-1366-a-125.png)).
- **Deux boutons principaux côte à côte** : « Faire passer l'oral » et « Corriger » sont tous deux violets ([capture 21](../preparer-evaluations/captures/21-oral-preparer-sans-ordre-1366.png)).
- **Des boutons cachés au lieu d'être grisés** : « Présenter le sujet » et « Grille PDF » n'existent pas tant que l'évaluation est « À construire », et rien n'explique pourquoi.
- **Des boutons placés au mauvais endroit** :
  - « Créer le lien » est collé sous le champ « Lien du QCM », donc on croit qu'il crée le lien du QCM ([capture frise](../test-espace-liens-etudiants/captures/01-frise-marie-1366.png)) ;
  - « Enregistrer le QCM » est en bas alors que « Publier le QCM » est en haut.
- **Des actions qui ne se défont pas, sans confirmation** : « Nouveau lien », « Régénérer », « Publier le QCM » (en partie corrigé sur la frise depuis). Quand une confirmation existe, c'est parfois la **fenêtre système du navigateur** (remplacer un dépôt).
- **Des petites cibles** : « Nouveau lien » fait 28 px de haut, les boutons radio du QCM 16 px.

**Écrans** : presque tous, surtout la page d'une évaluation, Séances, Espace étudiant·es (frise), Appréciations, QCM.

**Amélioration** : une règle à 4 niveaux, la même partout.
1. **Principal** (violet plein) : **un seul par écran ou par carte**, l'action qu'on vient faire.
2. **Secondaire** (contour) : les autres actions utiles.
3. **Discret** (texte avec icône) : les retours, « Voir le barème », « Annuler ».
4. **Danger** (texte ou contour rouge, toujours avec une confirmation de l'appli qui nomme l'objet : « Le lien actuel d'Alpha ne marchera plus. Continuer ? »).

Avec deux règles en plus :
- un bouton indisponible reste **visible et grisé**, avec la raison au survol ou dessous (« Passe le sujet en Prête pour le projeter ») ;
- quand il y a plus de 3 actions secondaires, on les range dans un menu « Plus » (cas des séances).

### T3. Retours, fil d'Ariane et menu : on ne sait pas toujours où l'on est

**Ce qu'on voit**
- **Le bouton retour change de nom et de place à chaque page** :
  - « ← Retour au module », en haut à droite à 1366 et sous le titre à 125 % ;
  - « ← Les évaluations », à côté des boutons d'action ;
  - « ← Vue d'ensemble » ;
  - « ← Toutes les appréciations », dans une carte ;
  - « ← Retour », tout en bas de la page Appréciations.
- **La pastille « Prochaine étape : Lire les attendus de la fiche »** est en haut à droite de **toutes** les pages du module, même pendant une correction ou l'écriture d'une appréciation. Elle prend la place où l'on attend le retour ou l'action de la page.
- **Le menu, le fil d'Ariane et le titre se contredisent** :
  - menu « Étudiant·es » mais titre « Groupes » ;
  - menu « Où j'en suis » surligné alors que le fil d'Ariane dit « Frise du module » ;
  - fil d'Ariane « Appréciations » alors que le menu surligne « Étudiant·es ».
- **Deux entrées « Étudiant·es »** l'une sous l'autre : celle du module et celle de l'appli.
- **Le nom du module est coupé** dans le menu (« TEST – à supprimer (… ») : avec 4 modules aux noms proches, on ne sait plus lequel est ouvert.
- **« Présenter le sujet » s'ouvre dans le même onglet** : en quittant, la page de l'évaluation (copies, notes) risque d'arriver sur le vidéoprojecteur.

**Écrans** : toutes les pages du module, Appréciations, Grilles, Réglages (« Changer cette limite » sans retour).

**Amélioration**
- **Un seul modèle de retour** : toujours en haut à gauche, au-dessus du titre, sous la forme « ← [nom de la page parente] ». On supprime les retours en bas de page.
- **Pas de doublon** : le fil d'Ariane suffit. Le retour séparé n'est utile que si l'on vient d'ailleurs (ex. Réglages → « ← Revenir aux appréciations »).
- **« Prochaine étape »** seulement sur « Où j'en suis » et sur le tableau de bord.
- **Même mot dans le menu, le fil d'Ariane et le titre.** Les sous-pages d'un écran (Appréciations dans Étudiant·es) gardent leur parent surligné **et** s'affichent dans le fil d'Ariane.
- Renommer l'entrée du module en « Étudiant·es et groupes ». Afficher le nom complet du module au survol, ou sur 2 lignes.
- **Tout ce qui se projette s'ouvre dans une nouvelle fenêtre**, directement en mode Diapositives (sujet, module, frise, liste des groupes).

### T4. Pages trop longues, actions sous le pli

**Ce qu'on voit** (en 1366 × 768)

| Écran | Hauteur | Ce qui est sous le pli |
|---|---|---|
| Page d'une évaluation | 5,8 écrans (9,6 à 125 %) | « Envoyer les résultats », liste des copies, « Supprimer » |
| Brief du projet | 4,9 écrans + défilement horizontal | barre « Enregistrer le projet » collée qui cache du contenu ([capture 09](../preparer-evaluations/captures/09-brief-21-phases-defilement-horizontal-1366.png)) |
| Formulaire « Modifier » | 2,8 écrans | fichiers joints **sous** Enregistrer ([capture 08](../preparer-evaluations/captures/08-fichiers-joints-sous-enregistrer-1366.png)) |
| Ajouter une évaluation | 1,9 écran | « Créer une évaluation » ([capture 05](../preparer-evaluations/captures/05-ajouter-evaluation-trois-choix-1366.png)) |
| Frise / Espace étudiant·es | 2 écrans | tout le bloc « Publier » (commence vers 720 px) |
| Grilles | 12,7 écrans | toutes les grilles dépliées |
| Éditeur de grille (9 critères) | 8,3 écrans | Enregistrer ([capture 24](../preparer-evaluations/captures/24-editeur-grille-1366.png)) |
| Banque de questions | 37 écrans | « Préparer un QCM avec cette banque » |
| Correction | colonne de droite | « Ton carnet » replié, environ 1,5 écran plus bas |

**Amélioration** : trois composants à généraliser.
- **La barre d'actions collée en bas**, comme sur la correction, pour tous les formulaires longs (évaluation, grille, QCM, brief) : « Enregistrer » toujours visible, avec l'état « Modifications non enregistrées ».
- **Des sections repliables avec un sommaire en haut** (déjà fait pour les fiches côté étudiant·e) : sur la page d'une évaluation, on garde dépliée la section qui sert maintenant (préparer avant la date, corriger après).
- **Pagination ou liste repliée** pour les listes longues (grilles, banque de questions) : nom, nombre de critères, utilisation, puis on déplie.
- **Remonter l'action du moment** : « Envoyer les résultats » en haut de la page dès que tout est corrigé, et « Créer une évaluation » en premier choix.

### T5. Le portable à 125 % et les fenêtres étroites

**Ce qu'on voit**
- **Le menu latéral est coupé à 125 %** : « Facture » et « Avis des étudiant·es » sont **cachés derrière la chouette**, posée en bas du menu ([capture 06](../test-espace-liens-etudiants/captures/06-marie-1366-a-125.png)). Le nom du module disparaît du menu en défilant ([capture 26](../preparer-evaluations/captures/26-evaluations-a-125pourcent.png)).
- **Séances en 3 colonnes à 125 %** : le titre de la séance déborde sur la colonne de droite et se coupe en 5 lignes très grandes ([capture 06](../test-espace-liens-etudiants/captures/06-marie-1366-a-125.png)).
- **Page Évaluations à 125 %** : aucune carte d'évaluation visible sans défiler. L'en-tête prend toute la hauteur (titre, phrase de 3 lignes, retour, carte projet).
- **Vue privée en fenêtre étroite (800 px)** : la liste des étudiant·es arrive **4 écrans plus bas** ; or c'est la fenêtre posée « à côté du projecteur ».
- **Tablette (768)** : le menu du module devient une rangée d'onglets qui défile de côté, et « Facture » et « Avis » sont cachés ([capture 27](../preparer-evaluations/captures/27-evaluations-tablette-768.png)).
- **Téléphone en paysage** (espace étudiant·e) : seuls l'en-tête et le nom du module sont visibles.

**Amélioration**
- **La chouette du menu** : la cacher quand la fenêtre est basse (moins de 800 px de haut), ou la placer en haut à côté du logo. Le menu doit pouvoir défiler sans que rien le recouvre.
- **Tester systématiquement chaque écran à 1366 × 768 à 125 %** (soit environ 1093 × 614 utiles) : c'est la vraie taille de Marie.
- **En-têtes de page plus compacts** : titre sur une ligne (le nom du module est déjà dans le fil d'Ariane, inutile de le répéter dans le titre « Évaluations — TEST – à supprimer (essais Claude) »), phrase d'aide repliable (« ? »).
- **Pages en 3 colonnes** : passer à 2 colonnes sous 1200 px utiles.
- **Vue privée** : sous 1000 px, la liste des étudiant·es passe en haut, ou dans un panneau fixe.

### T6. Retours après une action : enregistré ? perdu ? bloqué ?

**Ce qu'on voit**
- **Enregistrer une évaluation** prend 5 à 8 s sur « Enregistrement… », puis la page change **sans message**. Même chose pour une grille et pour « Passer en Prête ».
- **Pas d'alerte avant de quitter** une page modifiée : saisie d'objectif perdue, appréciation trop longue perdue (constaté deux fois), dernières lettres perdues après un rechargement.
- **Des avertissements importants en petit gris** : « 28 questions disponibles — pas assez pour cette règle » ([capture 17](../preparer-evaluations/captures/17-regle-impossible-avertissement-gris-1366.png)), et le QCM s'enregistre quand même ([capture 18](../preparer-evaluations/captures/18-qcm-enregistre-malgre-regle-impossible-1366.png)).
- **À l'inverse**, « À vérifier : il manque 4 h 02… » est en rouge vif sur fond sombre, alors que ce n'est pas bloquant.
- **Bon exemple déjà présent** : « Observation ajoutée pour Alpha… » en bas à droite, et « enregistrée à 23:09 » sur l'appréciation.

**Amélioration**
- **Un message de confirmation unique** (en bas à droite, 4 secondes, avec « Annuler » quand c'est possible) après chaque enregistrement, publication, passage en « Prête » ou copie : « Évaluation enregistrée », « Lien d'Alpha copié ».
- **Une alerte avant de quitter** dès qu'il y a des modifications non enregistrées, partout.
- **Ne jamais jeter un brouillon** : un texte trop long s'enregistre avec l'état « Trop longue ».
- **Trois niveaux d'alerte avec un style fixe** :
  - **info** : gris, petit ;
  - **attention** : jaune, avec une icône, dans un encadré ;
  - **bloquant** : rouge, encadré, avec l'enregistrement empêché ou une confirmation explicite.

  La règle de tirage impossible passe en « bloquant », et l'écart d'heures de la séance en « attention ».

### T7. Formulaires : longs, dans un ordre peu naturel, avec des champs trop petits

**Ce qu'on voit**
- **Le choix qui décide de tout arrive à la fin** : « Note de groupe » est la dernière case du formulaire, alors qu'elle change le coefficient et le cadre.
- **Les libellés de l'éditeur de grille se répètent et se coupent** : « Valeur du palier 1 (critère 1) » sur 3 lignes, dans une colonne de 90 px ([capture 24](../preparer-evaluations/captures/24-editeur-grille-1366.png)).
- **Des champs d'une ligne pour des textes longs** : la remarque d'observation fait 400 caractères dans une seule ligne, avec une limite de 1 000 caractères invisible.
- **Du texte libre là où une liste suffirait** : « Type » (4 suggestions qui ne sont pas les vrais types de Marie), « Référence du critère ».
- **Un champ privé au milieu du sujet** : « Retour d'expérience (privé) » est rangé dans la partie « Sujet fourni aux étudiant·es ».
- **Une saisie en double** : la durée du QCM est à retaper.

**Amélioration**
- **Commencer par les choix structurants** : type d'épreuve (une liste fermée des 5 types de Marie), puis groupe ou individuelle. Le reste du formulaire s'adapte (coefficient, cadre prérempli, blocs utiles).
- **Une grille éditée comme un tableau** : une ligne par critère, une colonne par palier, libellés uniquement dans l'en-tête.
- **Des champs texte qui s'agrandissent**, avec un compteur qui apparaît près de la limite.
- **Une « zone privée » visuellement distincte** dans tous les formulaires : fond légèrement différent et pastille « Pour toi seule » en titre. Rien de privé dans un bloc « pour les étudiant·es ».

### T8. Vocabulaire et ton : un mot par chose

**Ce qu'on voit**
- « **notes** » désigne tantôt une note chiffrée (« Note 13,2 »), tantôt une observation (« 15 notes privées », « Dernière note : participation »).
- « **Carnet** », « Journal d'observations » et « Observations de cours » désignent la même chose.
- « **Groupes** » ou « Étudiant·es » pour la même page. « Phrases » pour le menu, mais « Nouveau commentaire » pour le bouton.
- « **Retour étudiant·es** » pour le questionnaire de fin de module (renommé « Avis des étudiant·es » depuis : à vérifier partout).
- **Typographie** : « 1 pts », « 1.5 pts », « 1 personne l'ont consulté », « intervenante » ou « enseignante ».
- **Le ton côté étudiant·es** : règle validée par Marie, avec le tutoiement pour ce qui s'adresse à une personne et le vouvoiement pour le groupe. Elle n'est pas encore appliquée partout.

**Amélioration** : un **petit lexique** fixé une fois pour toutes, et appliqué partout :
- **observation** = ce que Marie note en classe (privé) ;
- **note** = un chiffre ;
- **commentaire** = ce qu'elle écrit sur une copie ;
- **appréciation** = le texte pour Hyperplanning ;
- **Étudiant·es et groupes** = la page du module.

Côté typographie : nombres à la française (« 1,5 pt »), accords singulier et pluriel, « Marie » côté étudiant·es.

### T9. Lisibilité et contraste (à mesurer précisément)

**Ce qu'on voit** (estimé sur les captures, pas mesuré à l'outil)
- **Beaucoup de texte d'aide en 12 px gris moyen** sur fond très sombre : « Un lien déjà créé ne peut pas être relu… », la note sous « Lien du QCM », les sous-titres de cartes. Il est lisible de près, fatigant à 125 % en fin de journée.
- **Les pastilles jaunes** (texte jaune sur fond jaune sombre) sont lisibles, mais les longues phrases dedans le sont moins.
- **Projection** : le texte s'ouvre à 80 %, la taille minimale, soit environ 20 px en 1920. Les repères de la frise sont des traits de 2 px, peu visibles.
- **Le logo « MG COURS »** est en capitales serrées, alors que tout le reste est en casse normale.

**Amélioration**
- Texte d'aide à **14 px minimum**, avec un gris plus clair (viser un contraste 4,5:1).
- Pas de phrase dans une pastille : 3 mots au maximum.
- Projection ouverte à **100 %** par défaut, repères de la frise plus épais.
- **Cibles cliquables de 36 px minimum** (boutons de ligne, radios).

### T10. Espace étudiant·e sur téléphone

**Ce qu'on voit**
- **En haut de l'écran** (360 × 640) : « MON ESPACE », le nom du module, le menu en pilules **sur 2 lignes**, « Bonjour Alpha ». Le bandeau QCM et la carte « Prochain rendu » prennent ensuite tout l'écran ([capture 14](../test-espace-liens-etudiants/captures/14-espace-v3-1366-et-360x640.png)).
- **Les accès « Cours / Projet / Évaluations / Notes » sont en double** avec le menu du haut.
- **Le nom du module apparaît 2 fois** sur l'accueil (en-tête et « Ce module en un coup d'œil »).
- **Un lien de résultats séparé** dont la note est tout en bas (d'après Marie, il ne sert à rien).

**Amélioration**
- Sur téléphone, **menu en barre d'onglets fixe en bas** (Accueil, Évaluations, Cours, Notes), en-tête réduit à une ligne.
- Accueil : « Bonjour Alpha » puis directement la carte de l'action du moment (QCM ouvert, prochain rendu), puis la frise. On supprime les accès en double.
- Supprimer ou masquer le lien de résultats séparé.

---

## 4. Plan d'amélioration priorisé

**P1** = à faire d'abord (risque d'erreur ou de perte, ou gêne quotidienne) · **P2** = gain net de confort · **P3** = finition.
Effort estimé pour Claude Code : **S** = quelques heures, **M** = une journée, **L** = plusieurs jours.

| # | Priorité | Amélioration | Écrans concernés | Capture | Effort |
|---|---|---|---|---|---|
| 1 | P1 | Alerte « modifications non enregistrées » avant de quitter une page, partout ; brouillon toujours gardé (même trop long) | Évaluation, Modifier, grille, QCM, brief, appréciation, observation | [04 appréciation](../suivi-appreciations/captures/04-ecrire-appreciation-1366.png), [05 trop longue](../suivi-appreciations/captures/05-trop-longue-non-enregistree.png) | M |
| 2 | P1 | Message de confirmation unique après chaque enregistrement, publication, passage en Prête ou copie | Toutes les pages qui enregistrent | [11 boutons apparus](../preparer-evaluations/captures/11-evaluation-prete-boutons-apparus-1366.png) | S |
| 3 | P1 | Un seul jeu de statuts (gris, jaune, vert, violet, rouge), mêmes mots, statut global prioritaire (« Complet » jamais à côté de « À construire ») | Évaluations (globale, module, ajout), page d'une évaluation, Séances, Appréciations, espace étudiant·e | [07](../preparer-evaluations/captures/07-evaluation-complet-et-a-construire-1366.png), [02](../preparer-evaluations/captures/02-liste-globale-evaluations-1366.png), [04](../preparer-evaluations/captures/04-page-evaluations-il-te-manque-1366.png) | M |
| 4 | P1 | Badge d'état cliquable (À construire / Prête / Fournie), visible dans toutes les listes | Page d'une évaluation, listes d'évaluations | [07](../preparer-evaluations/captures/07-evaluation-complet-et-a-construire-1366.png) | S |
| 5 | P1 | Trois niveaux d'alerte (info, attention, bloquant) ; règle de tirage impossible = bloquant | QCM, séances, cadre, publication | [17](../preparer-evaluations/captures/17-regle-impossible-avertissement-gris-1366.png), [18](../preparer-evaluations/captures/18-qcm-enregistre-malgre-regle-impossible-1366.png), [19](../preparer-evaluations/captures/19-tirage-impossible-decouvert-tard-1366.png) | M |
| 6 | P1 | Menu latéral à 125 % : la chouette ne recouvre plus le menu, et le menu défile entièrement | Toutes les pages | [06 à 125 %](../test-espace-liens-etudiants/captures/06-marie-1366-a-125.png), [26](../preparer-evaluations/captures/26-evaluations-a-125pourcent.png) | S |
| 7 | P1 | Confirmation de l'appli (pas du navigateur), qui nomme l'objet, avant toute action qui ne se défait pas | Liens personnels, résultats, Publier le QCM, dépôt | [02 liens](../test-espace-liens-etudiants/captures/02-liens-personnels-zone-texte.png) | S |
| 8 | P1 | Barre d'actions collée en bas (Enregistrer + état) sur les formulaires longs, comme sur la correction | Évaluation, Modifier, grille, QCM, brief | [06 correction](../suivi-appreciations/captures/06-carnet-dans-correction-1366.png), [08](../preparer-evaluations/captures/08-fichiers-joints-sous-enregistrer-1366.png) | M |
| 9 | P1 | Règle des boutons à 4 niveaux : un seul principal par écran, les copies ne semblent plus désactivées | Toutes, en priorité Appréciations, page d'une évaluation, Séances | [03](../suivi-appreciations/captures/03-liste-appreciations-1366.png), [21](../preparer-evaluations/captures/21-oral-preparer-sans-ordre-1366.png) | M |
| 10 | P1 | Ouvrir toute projection dans une nouvelle fenêtre, en mode Diapositives, à 100 % | Présenter le sujet, le module, la frise, les groupes | [12](../preparer-evaluations/captures/12-sujet-projete-date-vs-seance-1280x720.png), [32 à 100 %](../verif-projection-choisir-son-sujet/captures/32-a-100pourcent-1366.png) | S |
| 11 | P2 | Boutons indisponibles visibles et grisés, avec la raison | Page d'une évaluation (Présenter, PDF), QCM | [11](../preparer-evaluations/captures/11-evaluation-prete-boutons-apparus-1366.png) | S |
| 12 | P2 | Retour unique en haut à gauche ; « Prochaine étape » seulement sur Où j'en suis et Aujourd'hui | Toutes les pages du module, Appréciations, Réglages | [05](../preparer-evaluations/captures/05-ajouter-evaluation-trois-choix-1366.png), [03](../suivi-appreciations/captures/03-liste-appreciations-1366.png) | S |
| 13 | P2 | Menu, fil d'Ariane et titre identiques ; « Étudiant·es et groupes » dans le module ; nom du module lisible | Menu latéral, Étudiant·es, Frise, Appréciations | [01 frise](../test-espace-liens-etudiants/captures/01-frise-marie-1366.png) | S |
| 14 | P2 | En-têtes de page compacts (titre sans le nom du module, aide repliable) | Évaluations, Ajouter, Appréciations, Frise | [26](../preparer-evaluations/captures/26-evaluations-a-125pourcent.png) | S |
| 15 | P2 | Sections repliables et sommaire sur les pages longues ; action du moment remontée en haut | Page d'une évaluation, brief, Espace étudiant·es | [28 à 125 %](../preparer-evaluations/captures/28-page-evaluation-a-125pourcent.png), [09](../preparer-evaluations/captures/09-brief-21-phases-defilement-horizontal-1366.png) | M |
| 16 | P2 | Listes longues repliées ou paginées | Grilles, banque de questions, liste globale des évaluations | [15](../preparer-evaluations/captures/15-banque-questions-1366.png), [30](../preparer-evaluations/captures/30-recherche-grille-1366.png) | M |
| 17 | P2 | Pages en 3 colonnes ramenées à 2 sous 1200 px utiles ; titres qui ne débordent plus | Séances, vue privée | [06 à 125 %](../test-espace-liens-etudiants/captures/06-marie-1366-a-125.png) | M |
| 18 | P2 | Vue privée en fenêtre étroite : liste des étudiant·es en haut ou en panneau fixe | Faire cours (vue privée) | [02 vue privée 800](../suivi-appreciations/captures/02-vue-privee-800-liste-invisible.png) | M |
| 19 | P2 | Formulaire d'évaluation : type d'épreuve (liste fermée) puis groupe ou individuelle en premier | Ajouter / Modifier une évaluation | [06 bas du formulaire](../preparer-evaluations/captures/06-formulaire-bas-note-de-groupe-1366.png), [16](../preparer-evaluations/captures/16-qcm-cadre-coefficient-1-1366.png) | M |
| 20 | P2 | Éditeur de grille en tableau (critères × paliers), critères repliables | Grilles | [24](../preparer-evaluations/captures/24-editeur-grille-1366.png) | L |
| 21 | P2 | Zone privée visuellement distincte dans tous les formulaires | Modifier une évaluation, observation, correction | [07](../preparer-evaluations/captures/07-evaluation-complet-et-a-construire-1366.png) | S |
| 22 | P2 | Lexique unique (observation, note, commentaire, appréciation) et typographie française | Partout | [03](../suivi-appreciations/captures/03-liste-appreciations-1366.png) | S |
| 23 | P2 | Espace étudiant·e sur téléphone : onglets fixes en bas, en-tête d'une ligne, accès en double supprimés | Espace perso, lien de la classe | [14](../test-espace-liens-etudiants/captures/14-espace-v3-1366-et-360x640.png), [03 lien module](../test-espace-liens-etudiants/captures/03-lien-module-vs-espace-perso-360.png) | M |
| 24 | P3 | Texte d'aide à 14 px et gris plus clair ; contraste vérifié à l'outil | Partout | [02 liens](../test-espace-liens-etudiants/captures/02-liens-personnels-zone-texte.png) | S |
| 25 | P3 | Pas de phrase dans une pastille ; info (coefficient, sur 20) en texte simple, grille en lien | Évaluations, page d'une évaluation | [04](../preparer-evaluations/captures/04-page-evaluations-il-te-manque-1366.png) | S |
| 26 | P3 | Paliers côté étudiant·e en texte simple (pas en faux boutons) | Notes et corrigés | [08](../test-espace-liens-etudiants/captures/08-notes-espace-perso-360.png) | S |
| 27 | P3 | Cibles cliquables de 36 px minimum (boutons de ligne, radios QCM) | Liens, QCM | [11 QCM](../test-espace-liens-etudiants/captures/11-qcm-question-360.png) | S |
| 28 | P3 | Frise de projection : repères plus visibles, libellé qui ne réduit pas la barre | Projection | [frise 1366](../verif-projection-choisir-son-sujet/captures/frise-1366.png) | S |
| 29 | P3 | Tablette : menu du module sans défilement de côté (menu « Plus ») | Toutes les pages du module en 768 | [27](../preparer-evaluations/captures/27-evaluations-tablette-768.png) | S |

**Ordre conseillé** : les points 1, 2, 3, 6 et 7 d'abord. Ils sont rapides et réduisent les erreurs et les pertes. Ensuite 4, 5, 8, 9 et 10, qui forment le « kit de composants ». Le reste peut suivre écran par écran, en même temps que les corrections fonctionnelles des autres fils.

---

## 5. Kit de composants à fixer (référence pour Claude Code)

Ce sont les règles proposées ci-dessus, réunies en une page. Elles sont à décrire une fois dans le projet, puis à appliquer à chaque nouvel écran.

| Composant | Règle |
|---|---|
| **Statut** | 5 couleurs : gris (pas commencé), jaune (en cours ou à compléter), vert (prêt ou fait), violet (publié ou visible par les étudiant·es), rouge (bloquant). 1 à 3 mots, une ligne, en haut à droite de la carte. Cliquable quand l'état se change à la main. |
| **Info** | Texte gris séparé par des « · », jamais en pastille. |
| **Bouton principal** | Violet plein, 1 par écran ou par carte, toujours de la même taille. |
| **Bouton secondaire** | Contour. Au-delà de 3, on les range dans un menu « Plus ». |
| **Bouton discret** | Texte et icône (retour, voir le détail, annuler). |
| **Bouton danger** | Rouge, avec une confirmation de l'appli qui nomme l'objet et la conséquence. |
| **Indisponible** | Grisé et visible, avec la raison dessous. |
| **Retour** | « ← Page parente » en haut à gauche, au-dessus du titre. Un seul par page. |
| **Confirmation** | Message en bas à droite, 4 s, avec « Annuler » si c'est possible. |
| **Alerte** | Info (gris), attention (encadré jaune et icône), bloquant (encadré rouge, action empêchée). |
| **Barre d'actions** | Collée en bas des formulaires longs : état (« Modifié · non enregistré ») et bouton principal. |
| **Zone privée** | Fond légèrement différent et pastille « Pour toi seule » en titre. |
| **Projection** | Nouvelle fenêtre, mode Diapositives, 100 %. |
| **Taille minimale** | Texte d'aide en 14 px, cible cliquable de 36 px, vérification à 1366 × 768 à 125 %. |

---

## 6. Rebranding : de « MG COURS » à un nouveau nom

### 6.1 « Plume » : vérification faite, nom déjà pris

- **Plume** ([plume-app.co](https://plume-app.co/)) est une edtech française d'écriture, du CP à la Terminale. Elle a été fondée par deux anciennes professeures de lettres, développée avec le CNRS, et revendique plus de 20 000 enseignant·es. Elle est vendue aux établissements par [LDE](https://www.lde.fr/plume/) et présente au salon [Educatech](https://www.educatech-expo.com/en/conference/plume). Le public (enseignant·es), le pays et le circuit sont les mêmes : **le risque de confusion est fort**, et il s'agit très probablement d'une marque déposée.
- **« Plume - Fiches de révision »** (NextPixel, App Store, [fiche](https://mwm.ai/apps/plume-fiches-de-revision/6737467807)) vise les collégien·nes et lycéen·nes.
- **La chouette** : je n'ai trouvé aucune mascotte proche (chouette violette à toque) dans une appli éducative connue. La référence évidente est Duo, la chouette **verte** de Duolingo, et la tienne s'en distingue. Une chouette à toque reste un motif très courant dans l'éducation : il n'y a pas de risque juridique visible, mais elle est peu distinctive à elle seule.
- **Non vérifié** : les logos exacts de Plume (leur site bloque mon accès) et la base de l'INPI. Avant tout dépôt, il faut faire une recherche sur [data.inpi.fr](https://data.inpi.fr) pour les classes 9 (logiciels), 41 (éducation) et 42 (services en ligne).

**Décision d'Arnaud (8 novembre, 23 h)** : on change **tout**, le nom et la mascotte. Les propositions sont en 6.5. Le prompt de renommage prend le nom en paramètre.

### 6.2 Où le nom et le logo apparaissent aujourd'hui

| Endroit | Vu | Contenu actuel |
|---|---|---|
| Menu latéral, en haut | ✅ captures | Icône chouette carrée + « MG COURS » en capitales |
| Bas du menu latéral | ✅ | Grande chouette à toque (cause du chevauchement à 125 %) |
| Tableau de bord | ✅ | Chouette à côté de « Bonjour Marie » |
| Frise du module, Présenter le module, espace étudiant·e | ✅ | Chouette dans « Ce module en un coup d'œil » |
| Barre de progression de la projection | ✅ | Petite tête de chouette qui avance |
| Onglet du navigateur | ✅ (page de connexion) | `Connexion · MG COURS`, favicon |
| Description de la page | ✅ | « Gestion pédagogique et facturation — Marie Gautron » |
| Page de connexion | ✅ (titre) | « MG COURS » |
| Espace étudiant·e et lien de la classe | ✅ | En-tête « MON ESPACE » / « ESPACE ÉTUDIANT·E », sans nom d'appli visible sur les captures |
| PDF (grille, résultats, facture) | ❓ à vérifier | Nom des fichiers (« grille-evaluation.pdf ») ; en-tête et pied de page non vus |
| E-mails (« Envoyer par e-mail ») | ❓ à vérifier | Expéditeur, objet, signature : aucun e-mail envoyé pendant les tests |
| Facture | ❓ à vérifier | Probablement « MG » / Marie Gautron (c'est l'entreprise, pas l'appli : à ne pas renommer) |
| Manifest, icône d'accueil, aperçu de lien partagé (Teams) | ❓ à vérifier | L'aperçu Teams d'un lien étudiant·e montre le titre et l'image de la page |
| Adresse `mg-cours.vercel.app`, nom du dépôt | — | Technique ; à changer seulement avec un nom de domaine |

### 6.3 Pistes d'identité visuelle (en gardant l'existant)

*Écrit avant ta décision de tout changer. Les règles restent valables pour la nouvelle mascotte : expressions, palette figée, casse normale, version monochrome. Le nom et la mascotte sont en 6.5.*

**Nouvelle DA Marelle (8 novembre, 23 h 15)** : [planche de DA](https://claude.ai/artifact/GT7hA5kSudcAMUbhvmBetV). Demande d'Arnaud : frais, « 2026-27 », pas institutionnel, et conforme au RGAA.
- **Palette** : fond papier clair #F6F3EC, texte encre #14141F, bleu pie #3346E6 pour l'action, et des tuiles franches (jaune craie, menthe, lilas, rose marelle).
- **Style** : contours encre épais et ombres décalées nettes, sans dégradé.
- **Typographie** : Bricolage Grotesque pour les titres et le logo en minuscules (« marelle »), Inter pour le texte.
- **Margot** : une pie en sticker, avec 4 humeurs.
- **La frise devient une marelle** : les cases doubles sont les jours d'évaluation.
- **RGAA** : contraste du texte de 6,8:1 au minimum, statut toujours donné par une icône et un mot (jamais par la couleur seule), cibles de 44 à 48 px, focus de 3 px.

**Choix final (23 h 32) : « Studio de nuit · lavande »**. Noir profond, cartes gris très foncé, contours fins, aucun halo, et un seul accent lavande #B9A9FF, la couleur de l'aile de Margot, pour l'action. Les jetons sont dans le prompt de renommage, §4.

**Mise à jour (23 h 21)** : Lueur est finalement écartée (trop de halos, tuile verte). La base retenue est « Studio de nuit », sans le citron vert. Quatre accents sont proposés sur le canvas : lavande, pêche, glacier, monochrome. ~~Choix (23 h 19) : la piste « Lueur »~~. Bleu nuit, cartes arrondies, halo de couleur sous le bloc de l'action du moment, pêche pour l'action. Le logo, la typo et Margot sont gardés. Les jetons sont dans le prompt de renommage, §4. Les versions néobrutalistes, claire et sombre, ci-dessous, ont été écartées.

**Version sombre (23 h 11, écartée ensuite)** : même néobrutalisme, en plus doux. Fond nuit #15161D, cartes ardoise #1E2029, texte craie #F2EFE8 (15:1), contours fins et ombres décalées presque noires. Couleurs adoucies : bleu pie doux #8C9BFF pour l'action, miel, menthe douce, lavande, et corail pour le bloquant. Les grandes tuiles prennent une teinte sombre de leur couleur ; les aplats doux sont réservés aux pastilles et aux boutons, avec du texte nuit à 7:1 au minimum.

- **La chouette reste le centre** : on la nomme Plume, et on la fait un peu plus « vivante ». Une plume sur la toque ou à la place du pompon fait le lien avec le prénom et la distingue des chouettes à toque génériques. Elle peut prendre 3 ou 4 expressions : contente (« tout est prêt »), pensive (« il manque quelque chose »), endormie (état vide), qui lève l'aile (alerte). C'est plus utile que la chouette fixe du menu, qu'il vaut mieux retirer (cf. T5).
- **La palette actuelle est bonne, il faut la figer** : fond nuit bleutée, violet lavande pour l'action principale et le « publié », jaune doux pour « à compléter », vert menthe pour « prêt », et un rouge à ajouter pour « bloquant ». Il faut éviter le vert vif comme couleur de marque (confusion avec Duolingo).
- **La typographie** : la police des titres actuelle, ronde avec du caractère, va bien avec une mascotte. Le nom de l'appli devrait l'utiliser en **casse normale** plutôt qu'en capitales serrées (« MG COURS » détonne avec le reste). Le texte courant reste sobre.
- **Le thème clair** existe (bouton soleil) mais n'a été vu sur aucune capture : il est à vérifier avec la même palette.
- **Le logo** : la chouette seule pour le favicon et l'icône, la chouette avec le nom pour la connexion et le menu. Il faut prévoir une version monochrome pour les PDF imprimés en noir et blanc.

### 6.4 Prompt Claude Code

Il est dans [prompt-claude-code-rebranding.md](prompt-claude-code-rebranding.md). Le nom de l'appli y est un paramètre à remplir après ta décision.

### 6.5 Quatre couples nom + mascotte (après le choix « tout changer »)

Une recherche web rapide (8 novembre) n'a trouvé **aucune edtech** à ces noms. C'est un premier filtre, pas une recherche de marque : il faut vérifier sur [data.inpi.fr](https://data.inpi.fr) (classes 9, 41 et 42) avant d'adopter le nom.

| Nom | L'idée | Mascotte | Palette | Pour | Contre |
|---|---|---|---|---|---|
| **Marelle** | Le module se parcourt case par case, de la séance 1 à la clôture. Le côté jeu de cour d'école reste léger. | **Margot, la pie** : elle collectionne ce qui brille (la bibliothèque, les ressources) et elle est bavarde (projection, oral). | Noir encre, blanc craie, bleu-vert irisé des plumes de pie en couleur d'action. | Sympathique, se retient tout de suite, colle à la frise. | Nom courant pour des écoles et des crèches, donc moins distinctif. Il faut vérifier la marque de près. |
| **Sillon** | Le fil de la progression pédagogique, tracé séance après séance. | **Lise, l'alouette** : elle niche dans les sillons et chante au lever du jour (le cours qui démarre). | Terre chaude, blé doré pour l'action, vert tendre pour « prêt ». | Distinctif, sérieux, fait écho à « progression ». | Moins ludique, et le son « sillon / Silo » peut prêter à confusion à l'oral. |
| **Estrade** | Là où se tient l'enseignante pour faire cours et projeter. | **Hector, le héron** : posé sur une patte, calme, il observe la classe (vue privée, observations). | Bleu ardoise, jaune craie, corail pour l'action. | Très « prof », fort côté projection. | Évoque une pédagogie verticale. Les estrades ont disparu de beaucoup de salles. |
| **Préau** | L'abri de la cour : tout ce dont le module a besoin, au même endroit. | **Pépin, le hérisson** : petit, rassurant, il se roule en boule quand il manque quelque chose (alertes). | Brique, beige, vert sapin pour l'action. | Chaleureux, rassurant pour les étudiant·es aussi. | Parle plus à l'école primaire qu'au supérieur. |

**Choix d'Arnaud (8 novembre, 23 h 05) : Marelle et Margot la pie.** Point d'attention trouvé après le choix : une [police cursive libre « Marelle »](https://forge.apps.education.fr/marelle/marelle.forge.apps.education.fr/-/tree/main) existe pour l'école élémentaire, sur la forge de l'Éducation nationale, ainsi que plusieurs applis d'écoles « La Marelle » ([exemple](https://apps.apple.com/us/app/ecole-la-marelle/id1645905443)). Ce ne sont pas des outils pour enseignant·es du supérieur, mais le nom est déjà présent dans l'éducation : la vérification INPI est indispensable.

Pourquoi je l'avais recommandé : La pie remplace la chouette sans perdre le côté oiseau malin. Le noir et blanc irisé donne une palette bien à elle, loin du violet actuel et du vert de Duolingo. Et la marelle illustre exactement ce que fait l'appli : avancer case par case dans un module. Si la marque « Marelle » est trop encombrée à l'INPI, **Sillon** et l'alouette sont le meilleur plan B.

---

## 7. Limites de ce rapport

- Je ne me suis pas connecté à l'appli moi-même : tout vient des captures et des mesures des autres fils, prises entre le 5 et le 8 novembre. Certains points ont pu être corrigés depuis, comme « Retour étudiant·es », devenu « Avis des étudiant·es » sur les captures du 8.
- Les contrastes et les tailles de texte sont estimés à l'œil sur les captures, pas mesurés à l'outil.
- Le thème clair, les PDF, les e-mails et la facture n'ont pas été vus.
- Les fils « Faire cours », « Corriger et noter » et « Progression pédagogique » n'ont pas de rapport ni de captures dans le dossier commun. Je ferai un nouveau passage s'ils en ajoutent.

---

## 8. Mise à jour du 9 novembre (vers 0 h 30) : nouveaux rapports et captures

Depuis la première version, j'ai relu le nouveau rapport « Progression pédagogique » et ses 24 captures, les nouvelles captures de « Préparer les évaluations », et les retests des fils « Espace étudiant·es » et « Suivi et appréciations ». Les captures sont prises sur la prod du 8 novembre au soir et du 9 novembre à 0 h 40.

### 8.1 Déjà corrigé (vu par les autres fils)

| Plan | Ce qui a changé | Où le voir |
|---|---|---|
| #4 | Badge « Sujet : Prête / À construire » sur chaque carte, avec « Passer en Prête » en un clic | [v2-01](../preparer-evaluations/captures-v2/01-evaluations-compteurs-et-jour-j-1366.png) |
| #10 | « Présenter le sujet » s'ouvre en nouvelle fenêtre, en mode Diapositives | [v2-04](../preparer-evaluations/captures-v2/04-presenter-sujet-nouvelle-fenetre-1280x720.png) |
| #13 | « Étudiant·es et groupes » dans le menu du module, « Étudiant·es » pour le menu général | [v2-01](../preparer-evaluations/captures-v2/01-evaluations-compteurs-et-jour-j-1366.png) |
| #16 | Banque de questions paginée (50 par page), avec les questions sans réponse et les doublons signalés | [v2-09](../preparer-evaluations/captures-v2/09-banque-questions-paginee-1366.png) |
| #18 | Vue privée en fenêtre étroite : la liste des étudiant·es est en haut | rapport « Suivi », §13 |
| #19 | « Note de groupe / individuelle » en haut du formulaire, coefficient automatique, liste fermée des 5 types | [v2-10](../preparer-evaluations/captures-v2/10-formulaire-type-de-note-en-haut-1366.png) |
| #1, #2 (en partie) | « Évaluation enregistrée », alerte « modifications non enregistrées » sur l'évaluation et les attendus, message « Observation ajoutée… » avec « Annuler » | rapports « Préparer » v2 et « Suivi » §13 |
| #7 (en partie) | Remplacer un dépôt : confirmation dans l'app (et non plus dans le navigateur), qui nomme la personne | rapport « Espace », §17 |
| Compteurs | Deux chiffres nommés partout : « Prévues 5 / 2 · Notées 1 / 2 » | [v2-01](../preparer-evaluations/captures-v2/01-evaluations-compteurs-et-jour-j-1366.png) |

### 8.2 Problèmes transverses qui restent ou apparaissent

1. **Des signaux « prêt » encore faux : c'est le problème n° 1 de l'interface** (T1).
   - « Complet » en vert juste au-dessus de « ! À rendre » ([v2-03](../preparer-evaluations/captures-v2/03-page-evaluation-complet-vs-a-rendre-1366.png)).
   - « ! Où rendre » alors que le dépôt dans l'app est réglé.
   - La carte « Avant de générer » dit « Tous les attendus sont couverts : prêt » alors que le PDF imprime « aucun » pour chacun ([progression 11](../progression-pedagogique/captures/11-avant-generer-tout-est-pret-1366.png)).
   - Trois chiffres de couverture différents selon l'écran.
   - **Règle à poser** : un statut vert se calcule à partir de la même source que ce qui sera affiché, publié ou imprimé, et un même indicateur a la même valeur sur tous les écrans.
2. **« Prochaine étape » bloquée sur « Lire les attendus de la fiche »**, sur toutes les pages, même quand le module est entièrement prêt et la progression envoyée. À 125 %, la pastille prend maintenant une ligne à elle seule ([progression 16](../progression-pedagogique/captures/16-progression-a-125pourcent.png)). Cela renforce T3 : il faut la retirer des pages autres que « Où j'en suis », et la faire avancer.
3. **La même info en double sur une page** : « Prête · Remettre "À construire" » apparaît deux fois sur la page d'une évaluation, et le bloc « Prêt pour le jour J ? » répète le cadre ([v2-03](../preparer-evaluations/captures-v2/03-page-evaluation-complet-vs-a-rendre-1366.png)). Une seule source par information, à un seul endroit.
4. **La liste « Prêt pour le jour J ? » n'utilise pas le composant de statut** : des « ✓ » et des « ! » en texte, des liens soulignés tous identiques ([v2-03](../preparer-evaluations/captures-v2/03-page-evaluation-complet-vs-a-rendre-1366.png)). Le contenu est très bien ; il manque l'icône, la couleur et la hiérarchie du kit (§5), avec le manque en premier.
5. **Les documents envoyés ne sont pas figés** (nouveau, T6).
   - Progression : pas d'aperçu dans la page, même nom de fichier à chaque version, date « générée le 08/11 » sans heure.
   - « Régénérer » écrase la version déjà envoyée, sans prévenir.
   - **Règle à poser** : tout ce qui part à l'extérieur (progression, résultats, appréciations reportées) garde une version datée à la minute, consultable, et on prévient avant de la remplacer.
6. **Encore des pages géantes** (T4) : « Modifier la séance » fait 11 700 px (23 400 px sur tablette). Les champs exigés par l'école (animation, évaluation, matériel) sont **sous 405 ressources** ([progression 09](../progression-pedagogique/captures/09-modalites-apres-405-ressources-1366.png)). Il faut les remonter et replier la bibliothèque.
7. **125 % et tablette** (T5) :
   - page Progression : « Générer » sous le pli et 62 px de défilement horizontal à 125 % ([progression 16](../progression-pedagogique/captures/16-progression-a-125pourcent.png)) ; « Générer » à 1 434 px sur tablette ([progression 17](../progression-pedagogique/captures/17-progression-tablette-768.png)) ;
   - menu latéral : « Réglages » sous le pli à 768 px de haut, et la chouette toujours en bas du menu.
8. **Des actions qui ne se défont pas, sans confirmation** (T2) :
   - « Dupliquer le module » s'exécute en un clic ;
   - « Supprimer » un attendu, sans confirmation ;
   - « Régénérer » après l'envoi ;
   - « Publier le QCM ».
9. **Une liste qui cache ce qu'on vient de créer** : un module neuf n'apparaît pas dans l'onglet par défaut « En cours » de la liste des modules.
10. **Libellés** (T8) :
    - « dépose-la dans l'onglet Administratif » (l'onglet s'appelle « Documents ») ;
    - « Séance 1 · Séance 1 » au tableau de bord quand une séance n'a pas de titre ;
    - heure « 0:18 » au lieu de « 0 h 18 ».

### 8.3 Ajouts au plan priorisé

| # | Priorité | Amélioration | Écrans concernés | Capture | Effort |
|---|---|---|---|---|---|
| 30 | P1 | Un statut vert seulement si ce qui sera publié ou imprimé est vraiment complet ; même chiffre de couverture partout | Évaluation (cadre, jour J), Progression (Avant de générer), Rapprocher, Couverture | [v2-03](../preparer-evaluations/captures-v2/03-page-evaluation-complet-vs-a-rendre-1366.png), [progression 11](../progression-pedagogique/captures/11-avant-generer-tout-est-pret-1366.png) | M |
| 31 | P1 | Version figée et datée de tout document envoyé, aperçu dans la page, avertissement avant de régénérer | Progression, résultats, appréciations | [progression 14](../progression-pedagogique/captures/14-validee-regenerer-encore-possible-1366.png) | M |
| 32 | P1 | « Prochaine étape » qui avance, affichée seulement sur Où j'en suis et Aujourd'hui | Toutes les pages du module | [progression 16](../progression-pedagogique/captures/16-progression-a-125pourcent.png) | S |
| 33 | P2 | « Modifier la séance » : les champs de l'école en haut, la bibliothèque repliée | Séance | [progression 09](../progression-pedagogique/captures/09-modalites-apres-405-ressources-1366.png) | S |
| 34 | P2 | « Prêt pour le jour J ? » avec le composant de statut : manques en premier, et pas de doublon avec le cadre | Page d'une évaluation | [v2-03](../preparer-evaluations/captures-v2/03-page-evaluation-complet-vs-a-rendre-1366.png) | S |
| 35 | P2 | Page Progression à 125 % et sur tablette : boutons en haut, plus de défilement horizontal | Progression | [progression 16](../progression-pedagogique/captures/16-progression-a-125pourcent.png), [17](../progression-pedagogique/captures/17-progression-tablette-768.png) | S |
| 36 | P2 | Confirmations pour Dupliquer le module, Supprimer un attendu, Publier le QCM | Documents, Attendus, QCM | — | S |
| 37 | P3 | Liste des modules : un module neuf visible tout de suite ; libellés « Documents », titres de séance par défaut, heures « 0 h 18 » | Modules, Attendus, tableau de bord, Rendus | [progression 04](../progression-pedagogique/captures/04-module-cree-ou-j-en-suis-1366.png) | S |

Ces points se règlent naturellement avec le kit de composants (§5) et la DA « Studio de nuit · lavande » (§6) : le composant de statut unique corrige les n° 1, 3 et 4, et la règle « un seul bloc mis en avant par écran » corrige le n° 2.

---

## 9. Tour de la prod du 9 novembre (9 h 40, lecture seule)

Connexion avec le compte de Marie dans mon navigateur de test, chemin cliqué depuis Aujourd'hui, à 1366 × 768 à 125 % (1093 × 614), puis tablette 768 et téléphone 360. Aucun bouton d'enregistrement cliqué. Captures dans [captures-2026-11-09/](captures-2026-11-09/).

### 9.1 Ce que je n'avais pas vu

| # | Constat | Écran | Capture |
|---|---|---|---|
| 38 | **Le thème sombre existe déjà** et il est actif : accent violet proche de la lavande, pastilles de statut vertes. Mais il garde des **lueurs de fond** (dégradé en bas à droite) et des **icônes de menu sur tuiles de couleur** (rouge, bleu, vert, jaune), deux choses qu'Arnaud a écartées. Le prompt de rebranding doit **ajuster ce thème**, pas en créer un second. | Partout | [aujourdhui-125](captures-2026-11-09/aujourdhui-125.png) |
| 39 | **Les modules de test envahissent le vrai tableau de bord** : « Séances faites 0 / 8 » et la prochaine séance viennent de « TEST Progression », et « À corriger » ne montre que des copies TEST. Marie verrait ça lundi matin. | Aujourd'hui | [aujourdhui-125](captures-2026-11-09/aujourdhui-125.png) |
| 40 | **Doublons dans les filtres** : « Accessibilité & Qualité Web » et « TEST Progression » apparaissent deux fois dans le filtre Module des Évaluations, sans l'année pour les distinguer. | Évaluations (liste globale), Étudiant·es | — |
| 41 | **Jalons se contredit** : la page Jalons dit « Aucun jalon pour ce module » alors que la page Évaluations dit « Jalons du projet : 1 » et que « Cadrage du produit » est marqué Jalon. | Jalons, Évaluations du module | [jalons-125](captures-2026-11-09/jalons-125.png) |
| 42 | **En-têtes différents d'une page à l'autre** : Jalons et Couverture n'ont ni fil d'Ariane ni « Prochaine étape » ; Évaluations a fil d'Ariane + « ← Retour au module » + menu (3 retours) ; Facture a « Retour au module » sans flèche. | Jalons, Couverture, Évaluations, Facture | [couverture-125](captures-2026-11-09/couverture-125.png), [evaluations-module-125](captures-2026-11-09/evaluations-module-125.png) |
| 43 | **« Prochaine étape » en double** sur Où j'en suis (pastille en haut + grande carte), et la pastille « Prochaine étape : Écrire les appréciations » reste affichée sur la page Appréciations elle-même. | Où j'en suis, Appréciations | [module-tablette](captures-2026-11-09/module-tablette.png) |
| 44 | **Le tableau de bord et la liste des modules ne disent pas la même chose** : Aujourd'hui dit « Envoyer la progression de Fil Rouge… en retard de 18 j », la liste des modules dit pour le même module « Prochaine étape : prévoir les évaluations ». | Aujourd'hui, Modules | [modules-125](captures-2026-11-09/modules-125.png) |
| 45 | **Évaluations du module** : « Évaluations (4) » à côté de « Prévues 3 / 3 » sans explication (le rattrapage ou le QCM ne compte pas ?) ; le bouton principal reste « Ajouter une évaluation » alors que tout est prévu et noté ; « Sujet : » est lu deux fois par les lecteurs d'écran. | Évaluations du module | [evaluations-module-125](captures-2026-11-09/evaluations-module-125.png) |
| 46 | **Toujours là** : à 125 %, le sous-menu du module s'arrête à « Documents » sous la chouette (Facture, Avis cachés) ; la séance garde une colonne du milieu d'environ 180 px (titre sur 4 lignes, page de 10 700 px) ; sur tablette, les onglets du module sont coupés (« Do… »). | Menu, Séance, module sur tablette | [seance-125](captures-2026-11-09/seance-125.png), [module-tablette](captures-2026-11-09/module-tablette.png) |
| 47 | Les pages Modules et Bibliothèque affichent un squelette vide 2 à 3 s avant le contenu. | Modules, Bibliothèque | — |

### 9.2 Ce qui s'est amélioré

- **Téléphone** : barre d'onglets en bas (Aujourd'hui, Modules, Étudiant·es, Bibliothèque, Plus), en-tête compact, pas de défilement horizontal. Le point #27 est en grande partie réglé côté Marie.
- **Menu principal** réduit à 6 entrées, entièrement visible à 125 %.
- **Couverture des attendus** : vrai tableau lisible (attendu, cours, évaluations, état), avec une pastille de statut claire.
- Aucun défilement horizontal sur les 20 pages visitées à 125 %, 768 et 360.

### 9.3 Remarques d'Arnaud (9 novembre, 15 h 10), page d'une évaluation

| # | Priorité | Constat | Capture |
|---|---|---|---|
| 48 | P1 | Défilement trop long : il faut beaucoup descendre pour atteindre le tableau des copies. | — |
| 49 | P3 | « Attendus évalués » prend toute la largeur et écrase la colonne voisine (un mot par ligne). Arnaud : « jmen fous un peu », donc à replier simplement. | [evaluation-attendus-ecrase](captures-2026-11-09/evaluation-attendus-ecrase.png) |

---

## 10. Exigence relevée (demande d'Arnaud, 9 novembre, 15 h 15)

Arnaud : « il faut être plus exigeant dans les améliorations UX ». J'ai donc remesuré la correction d'un oral en prod (module SCRUM, « Oral de fin de projet », lecture seule, 1366 × 768) avec quatre critères durs, et j'ai remonté les priorités.

### 10.1 Les critères appliqués désormais à chaque écran

1. **Place réelle pour écrire** : tout champ où l'on rédige plus d'une phrase fait au moins 4 lignes, s'agrandit avec le texte et prend au moins 60 % de la largeur utile. Un champ d'une ligne est réservé aux titres, liens et nombres.
2. **Écrans et défilement** : l'action pour laquelle on vient sur la page est visible sans défiler. Aucune page de travail ne dépasse 3 hauteurs d'écran ; au-delà, on replie ou on découpe.
3. **Clics inutiles** : une seule façon d'enregistrer (automatique, avec un état visible), une seule façon d'aller à la copie suivante, aucun bouton « Enregistrer » par bloc.
4. **Blocs hors sujet** : la page s'adapte au type d'évaluation. Un oral n'a ni dépôt, ni lien GitHub, ni ZIP ; un QCM n'a pas de grille à paliers ; un point d'étape n'a pas de note.

### 10.2 Ce que la mesure a donné

| # | Prio | Constat mesuré | Capture |
|---|---|---|---|
| 50 | **P0** | **Page de l'évaluation orale : 6 941 px**, soit 9 écrans. Les boutons « Note du groupe » arrivent à 5 700 px, après 7 écrans de défilement. | [oral-page-evaluation-pleine-page](captures-2026-11-09/oral-page-evaluation-pleine-page.png) |
| 51 | **P0** | **Blocs hors sujet sur un oral** : « Rendus : 0/3 rendu reçu », « Rendus déposés » avec un champ GitHub et une étiquette par groupe, « Tout télécharger (ZIP) », « Enregistrer “où rendre” », et sur la note du groupe un bloc « Rendu · aucun rendu ». | idem |
| 52 | **P0** | **Pas de place pour écrire** : « Un mot pour [étudiant·e] » = une ligne de 32 px ; dans « Comparer un critère », le commentaire = une ligne de 32 px sur 400 px qui coupe le texte, alors que « Palier » et « À vérifier » laissent de la place vide ; le Bilan (points forts, progrès, commentaire libre) tient dans une colonne de 286 px. | [oral-note-groupe-pleine-page](captures-2026-11-09/oral-note-groupe-pleine-page.png), [oral-comparer-commentaire-arnaud](captures-2026-11-09/oral-comparer-commentaire-arnaud.png) |
| 53 | **P0** | **L'oral est noté en points (2 / 1,5 / 1 / 0) alors qu'il se note en lettres A à D.** | [oral-comparer-critere](captures-2026-11-09/oral-comparer-critere.png) |
| 54 | P1 | **Trois façons d'enregistrer** : « Tout s'enregistre au fur et à mesure », plus « Enregistrer tout », plus « Enregistrer la note ». Sur la page de l'évaluation, 7 boutons Enregistrer différents (horaires, attendus, où rendre, rendu ×3…). | idem |
| 55 | P1 | **Trois façons de naviguer** entre copies (Copie précédente/suivante, « Aller à une copie », « Vue d'ensemble ») et deux vues (par copie / par critère) en plus de « Comparer ». | idem |
| 56 | P1 | **Aides clavier affichées** (« touches 1 à 4 », « ↑ ↓ changent de ligne », « Alt + ← / → ») alors que Marie et Arnaud n'utilisent jamais le clavier. Elles prennent la place d'aides utiles. | idem |
| 57 | P1 | La barre collée en bas (« 15 / 20 · Enregistrer la note ») recouvre les paliers du critère en cours. Les onglets de critères débordent (« Suivi, vélocité et… » coupé). Une 5e tuile « Pas encore noté » s'ajoute aux 4 paliers. | idem |
| 58 | P1 | « Attendus évalués » occupe 1 300 px sur la page de l'évaluation (voir #49). | idem |

### 10.3 Priorités revues

Les points #50 à #53 passent **avant tout le reste**, y compris avant les composants communs : ce sont ceux qui empêchent de faire le travail (écrire, trouver les copies, noter dans la bonne échelle). Les anciens P1 « signaux justes » et « documents figés » restent P1. Le vocabulaire et la typographie restent P3.

---

## 11. Densité : « tout est gros et giga scrollable » (Arnaud, 9 novembre, 20 h 45)

Mesure en prod, lecture seule, chemin : Modules → Fil Rouge FullStack : Cadrage → Séances → séance 2 « Retour sur le cadrage, apport architecture ».

### 11.1 Ce que j'ai mesuré

| Mesure | 1366 × 768 (100 %) | 1366 à 125 % (1093 × 614) |
|---|---|---|
| Hauteur de la page | **8 061 px = 10,5 écrans** | **13 800 px = 22,5 écrans** |
| Largeur de la colonne où l'on édite la séance | 422 px | **149 px** (le titre tient sur 4 lignes, 2 à 3 mots par ligne) |
| Colonne de gauche (liste des 4 séances) | 320 px | 320 px (plus large que la colonne de travail) |
| Colonne de droite (attendus) | 288 px, 1 134 px de haut | idem |
| « Le déroulé de la séance » | 3 073 px | 5 469 px |
| « Ressources retenues (31) » | 3 778 px, tout déplié | 6 474 px |
| Boutons de 44 à 48 px de haut | 69 | 69 |
| Champs du déroulé | 13 étapes × 3 champs de 61 × 44 px (durée, modalité…) | idem |

Captures : [seance-fil-rouge-1366](captures-2026-11-09/seance-fil-rouge-1366.png), [seance-fil-rouge-125](captures-2026-11-09/seance-fil-rouge-125.png), [pleine page](captures-2026-11-09/seance-fil-rouge-1366-pleine-page.png).

### 11.2 Pourquoi ça paraît gros

Le texte lui-même n'est pas énorme (corps 16 px, aide 14 px, titres 18 à 24 px). Ce qui fait « gros », c'est :
1. **Les colonnes sont réparties à l'envers** : la liste et les attendus ont une largeur fixe, et c'est la colonne de travail qui s'écrase. À 125 %, elle fait 149 px, donc tout passe sur des dizaines de lignes.
2. **Tout est déplié** : 31 ressources, 13 étapes du déroulé, 9 attendus en texte long, sans repli ni pagination.
3. **Chaque action est un gros bouton** : 5 boutons d'ajout empilés à gauche (Ajouter une séance, Depuis un planning, Depuis un autre module, Planning, Frise), 7 boutons d'action sous le titre, chacun sur sa ligne à 125 %.
4. **Cartes dans des cartes** avec 16 à 20 px de marge intérieure à chaque niveau, et des phrases d'aide de 2 à 3 lignes sur chaque bloc.

### 11.3 Règles de densité pour toute l'appli

Ajoutées au prompt de rebranding (§4) et au prompt de corrections (lot 0) :
- **Deux densités, une seule par défaut** : « Compacte » par défaut (corps 15 px, aide 13 px, titres de page 22 px, titres de carte 16 px, marge de carte 12 à 16 px, écart entre cartes 12 px) et « Confortable » (l'actuelle) dans Réglages > Apparence. Les cibles de clic restent à 44 px de haut, mais les boutons secondaires et discrets peuvent faire 36 px avec une zone cliquable de 44 px.
- **La colonne de travail est prioritaire** : elle fait au moins 560 px. Les colonnes d'appoint (liste, attendus, aide) se replient en tiroir ou passent dessous avant que la colonne de travail descende sous 560 px. À 125 % sur un portable, la page séance passe donc en 1 colonne + un tiroir « Les 4 séances ».
- **Rien de long n'est déplié par défaut** : une liste de plus de 5 éléments s'affiche à 5 avec « Voir les 26 autres ». Un texte d'attendu de plus de 2 lignes est tronqué avec « Lire la suite ».
- **Une seule rangée d'actions** par en-tête : 1 bouton principal, 2 secondaires au plus, le reste dans « Plus ». Les boutons d'ajout de la liste passent dans un seul « Ajouter ▾ ».
- **Pas de carte dans une carte** : un seul niveau d'encadré, les sous-parties sont séparées par un filet de 1 px.
- **Aide repliée** : la phrase d'aide d'un bloc tient sur une ligne ou passe derrière un « ? ».
- **Budget de hauteur** : une page de travail tient en 3 écrans au plus à 1366 × 768, et en 4 à 125 %. La séance Fil Rouge devra passer de 10,5 à 3 écrans, et de 22,5 à 4 à 125 %.
