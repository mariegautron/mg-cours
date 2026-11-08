# Parcours « Faire cours » : suites du test d'ergonomie du 5 novembre 2026

Corrections livrées sous US-172 (voir `docs/BACKLOG.md`). Ce document garde ce qui reste à faire,
à vérifier et à décider.

## Reste à corriger

- **Bouton « Clôturer la séance » visible sans défiler** (constaté à y ≈ 1220). La barre d'action
  est déjà `sticky bottom-0` dans `src/components/notebook/closure-form.tsx` : le problème vient
  probablement du conteneur de page (défilement ou hauteur). À diagnostiquer dans un navigateur.

## À vérifier à l'écran

Aucun test automatisé n'a été lancé pour ces corrections. Les tests du lot 1 sont écrits
(`src/lib/present/position.test.ts`) mais n'ont jamais été exécutés. Tailles à contrôler :
1366 × 768, 1366 × 768 zoomé à 125 %, 1280 × 720, 1440 × 900 ; fenêtre projetée à 1280 × 720 et
1920 × 1080. Toujours en cliquant depuis la page de connexion, sans taper d'adresse.

- Position conservée : fermer puis rouvrir la fenêtre projetée, l'actualiser (F5), rouvrir la vue
  privée seule, tout fermer puis rouvrir.
- Carnet → « Ouvrir la présentation » : le corrigé et les fiches « pour aller plus loin » ne sont
  pas projetés ; « Présenter le module » ne liste plus de corrigés.
- Bouton « Commencer le cours » de « Avant de commencer » : ouvre la fenêtre projetée et la vue
  privée (navigateur qui bloque les fenêtres ?). Boutons « Projeter / Pour moi » sous le titre à 125 %.
- Vue privée : trois colonnes qui défilent séparément, liste des étudiant·es et « Clôturer la
  séance » toujours visibles, diapo courante et suivante côte à côte.
- Projection : texte qui s'adapte à la largeur (taille × largeur / 1280, plafonné à 1,5), barre
  Précédente / Suivante toujours visible, y compris sur la diapo de correction du QCM ; Échap ferme
  le Sommaire.
- Observations : touches 1 à 5 (Linux, Mac, Windows), message en surimpression, étiquettes sur deux
  lignes.
- Tableau de bord après la clôture d'une séance ; recherche Ctrl K par titre et par « séance 5 ».
- Import de séances depuis un autre module : ordre du déroulé, livrable et détails d'activité repris.

## Questions pour Marie (non tranchées)

1. Les points non traités doivent-ils s'ajouter automatiquement au déroulé de la séance suivante ?
2. Le texte projeté à 80 % : réglage voulu ? Le code met 100 % par défaut ; le 80 % observé vient
   sans doute d'un réglage gardé dans le navigateur.
3. Les mini-QCM n'existent qu'en mode Diapositives (ni en Document, ni dans le Sommaire) : voulu ?
4. Où se trouve « l'espace étudiant » à mettre à jour ? Il n'a pas été trouvé dans l'application.

## Anomalies relevées au test du 6 novembre (module de test)

Corrigées : enregistrer « Modifier la séance » réordonnait le déroulé et effaçait le type, la
durée et l'objectif de chaque activité (les liens aux ressources étaient supprimés puis recréés) ;
« Faite aujourd'hui » absent du tableau de bord quand plus aucune séance n'est à faire, et case du
jour qui menait à une séance déjà faite ; taille du texte projeté à 80 % sans réglage enregistré.

À vérifier : temps écoulé / restant en vue privée avec un créneau en cours (le test avait un
créneau 23:00-23:59 à 17 h) ; relevé de la projection à la clôture, qui montrait les projections
de la veille (probablement dû au changement de date de la séance de test) ; « Préparer la séance
suivante » sur un module qui a une séance suivante ; badge « Vue privée : jamais projetée »
affiché alors que la diapo est projetée (libellé à revoir ?).
