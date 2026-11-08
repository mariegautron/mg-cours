# Proposition — « Proposer un brouillon » d'appréciation (lot 3)

**Décision (08/11/2026) : gabarit gratuit sans service externe, pour le moment.** Implémenté dans
`src/lib/appreciations/draft.ts` : rien ne sort de l'appli, aucun coût. Les sections « Confidentialité » et
« Coût » ci-dessous décrivent l'option API Claude, écartée pour l'instant et gardée pour plus tard.
Limite connue du gabarit : chaque thème a 6 variantes par phrase, donc dans une grosse classe une même
phrase peut revenir chez deux personnes (les textes complets, eux, restent distincts) ; Marie relit et modifie toujours.

Statut initial du document : proposition à valider avant code.
Les lots 1, 2, 4 et 5 sont livrés ; la migration `20261120000000` ajoute déjà la colonne
`appreciation.is_proposal` (« Proposé, à relire ») et le badge existe dans la liste.

## Ce que Marie verrait

1. **Écran d'écriture** : bouton « Proposer un brouillon » au-dessus du champ.
   - Le texte arrive dans le champ, marqué **« Proposé, à relire »**, avec la mention
     « basé sur tes observations » ou « basé sur les infos du groupe » (si rien de précis sur la personne).
   - Le statut ne passe à « Écrite » qu'après une modification ou un clic sur « Valider ».
   - « Autre proposition » régénère ; le texte écrit à la main n'est jamais écrasé sans confirmation.
2. **Liste** : « Proposer pour toutes les appréciations à écrire ». Ne traite que les personnes « À écrire »
   (jamais une appréciation déjà écrite ou modifiée). Barre de progression, puis chaque brouillon apparaît « Proposé, à relire ».
3. Rien n'est copié ni exporté sans elle : « Copier » et « Tout copier » ignorent ou signalent les brouillons non relus.

## Style imposé (consigne donnée au modèle)

- Au « tu », positif, centré sur le comportement.
- Dans l'ordre : un point fort, un axe de progrès concret, un encouragement.
- Longueur ≤ limite de l'école (250 par défaut), vérifiée côté serveur ; relance une fois si dépassé.
- Jamais la même phrase pour deux personnes : en lot, on fournit au modèle les brouillons déjà produits
  et on rejette tout brouillon dont une phrase est identique à un autre (comparaison normalisée).
- « Mon avis » et « À challenger » peuvent nourrir le fond, mais ne sont jamais cités tels quels ni attribués.
- Absences : exclues, sauf si Marie coche « tenir compte des absences ».

## Sources lues pour un brouillon

Observations de la personne (étiquette, date, texte), observations de son groupe, commentaires de correction
(points forts, progrès, commentaire, mot personnel), notes du module (valeur sur barème). Ce sont exactement
les blocs du panneau « D'après » (lot 2).

## Confidentialité — ce qui sort de l'appli

- **Service proposé** : l'API Claude d'Anthropic, appelée **depuis le serveur** de l'appli (Server Action),
  jamais depuis le navigateur. La clé reste dans les variables d'environnement serveur, jamais dans le code.
- **Envoyé pour une personne** : son **prénom seulement**, ses observations (texte, étiquette, date),
  celles de son groupe (sans prénoms des autres membres : « un·e membre du groupe »), ses commentaires de
  correction, ses notes sur 20 avec le type (groupe / individuelle). **Jamais** : nom de famille, e-mail,
  photo, identifiant, nom de l'école ou du module, appréciations d'autres personnes (sauf les phrases déjà
  produites en lot, pour éviter les doublons, sans prénom).
- Les observations ne sortent de l'appli **que lors d'un clic** sur « Proposer ». Aucun envoi automatique.
- Le brouillon renvoyé est stocké dans `appreciation` (`is_proposal = true`) ; les textes envoyés ne sont pas
  conservés par l'appli. À vérifier avant mise en service : l'option de **non-conservation / non-entraînement**
  de l'offre API choisie, car ce sont des commentaires privés sur des personnes.
- Points d'attention RGPD : base légale et information des étudiant·es (mention dans la politique de
  confidentialité de l'école ou du site) — à confirmer par Marie avec l'école.

## Coût

Ordre de grandeur pour un module de 30 personnes : environ 1 000 à 2 000 mots en entrée par personne
(observations + commentaires) et ~60 mots en sortie, soit de l'ordre de **60 000 jetons en entrée et
3 000 en sortie par module**. Avec un petit modèle (Haiku 5.5), c'est de l'ordre de quelques centimes
à quelques dizaines de centimes par module ; un plafond mensuel dans la console du fournisseur limitera
le risque. Le prix exact est à vérifier sur la grille tarifaire en vigueur avant activation.

## Garde-fous techniques

- Activation par variable d'environnement (`APPRECIATION_DRAFT_ENABLED`) : sans clé, les boutons sont
  masqués et l'appli se comporte comme aujourd'hui.
- Un appel par personne, délai maximum, une relance au plus ; en cas d'échec, message clair et champ intact.
- Journal minimal (date, module, nombre de personnes, jetons) **sans contenu**.
- Les observations et appréciations restent exclues de l'écran projeté, des PDF, des e-mails et de l'espace
  étudiant·es (aucune de ces sorties ne lit ces tables aujourd'hui).

## Questions pour Marie

1. Es-tu d'accord pour envoyer ces données (prénom + observations) à un service externe (Anthropic) ?
   Sinon, alternative : un **gabarit sans IA** (assemblage de phrases-types par étiquette), moins personnel.
2. Faut-il que le brouillon mentionne explicitement les notes, ou seulement le comportement ?
3. Veux-tu choisir un ton (plus chaleureux / plus sobre) par module ?

## Hors périmètre de cette proposition

Aucune génération n'est faite tant que cette page n'est pas validée.
