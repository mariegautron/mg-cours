# Sécurité de la passation des QCM (US-95)

Les étudiant·es n'ont pas de compte : elles et ils passent le QCM avec un **lien personnel**. C'est la seule
surface publique de l'application (`/q/[token]`). Cette page recense ce qu'elle expose et comment c'est fermé.

## Modèle

- **Jeton** : 256 bits aléatoires (`crypto.randomBytes(32)`, base64url, 43 caractères). Seul son **SHA-256** est
  stocké (`quiz_attempt.token_hash`). Le lien en clair n'existe que dans la réponse qui le génère (CSV, e-mail) ;
  un lien perdu se remplace (« Nouveau lien », l'ancien meurt).
- **Un jeton = une copie** d'un·e étudiant·e ; il n'ouvre rien d'autre. Aucun identifiant interne dans l'URL.
- **Révocable** (`revoked_at`), **borné à la fenêtre** du QCM (`opens_at` / `closes_at`, statut `published`).
- Aucun accès de l'anonyme aux tables : droits `anon` retirés **et** RLS `owner_id = auth.uid()` sans politique
  anonyme. L'anonyme n'exécute que 4 fonctions `security definer` (`search_path` vide) :
  `mg_quiz_session`, `mg_quiz_start`, `mg_quiz_save`, `mg_quiz_submit`. Les aides internes
  (`mg_quiz_view`, `mg_quiz_public_questions`, `mg_quiz_family_closed`, `mg_quiz_clean_answers`) et
  `mg_quiz_ip_failure` (réservée à `service_role`) ne sont pas exécutables par `anon` ni `authenticated`.
- Le client Supabase de la route publique est **sans cookies** (`createAnonClient`) : il ne porte jamais la
  session de Marie. La clé service role reste côté serveur (`createAdminClient`), jamais dans le navigateur.

## Revue des accès anonymes

| Surface                    | Ce qui est renvoyé                                                                                             | Ce qui est fermé                                                                                                                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mg_quiz_session`          | état + titre ; « prêt » : consignes, durée, nombre de questions ; « en cours » : énoncés et choix `{id, text}` | jamais `fraction`, `is_correct`, retours, valeur numérique attendue, nom de question, identifiant de question, nom d'un·e autre étudiant·e, note d'un·e autre                                                                    |
| `mg_quiz_start`            | idem `session` ; démarre le chrono **serveur** (`deadline_at`)                                                 | démarrage impossible hors fenêtre / hors `published` / déjà commencée                                                                                                                                                            |
| `mg_quiz_save`             | `{status, saved_at, late}`                                                                                     | jamais limité (on ne perd pas une copie) ; entrée nettoyée (clés = positions 1..N), taille ≤ 200 ko ; après l'heure limite + 90 s les modifs vont dans `late_answers` (conservées, pas comptées d'office) ; refus si déjà rendue |
| `mg_quiz_submit`           | `{status}`                                                                                                     | jamais refusée pour retard (copie marquée en retard) ; idempotente                                                                                                                                                               |
| Corrigé (`results.review`) | seulement si la copie est entièrement corrigée **et** le QCM clôturé pour tout le monde                        | voir ci-dessous                                                                                                                                                                                                                  |

**Corrigé et rattrapages** : `mg_quiz_family_closed` est faux tant qu'un QCM de la famille (original + rattrapages)
n'est pas clôturé, ou tant que des absent·es excusé·es de l'original n'ont pas de QCM de rattrapage. Sinon le corrigé
fuiterait vers celles et ceux qui passent plus tard. Marie voit pourquoi le corrigé est caché (`familyClosedReason`).

**Réponses libres** : la note n'existe pas (`grade.value` null : ni compteur YNOV, ni moyenne) tant que toutes les
réponses libres ne sont pas relues ; l'étudiant·e ne voit rien avant.

## Limitation de débit

- **Par jeton, dans le SQL** : 120 lectures (`mg_quiz_session`) par minute → `rate_limited`. Jamais sur `save` /
  `submit`.
- **Par IP, côté serveur** (`/q/*`) : table `quiz_ip_failure` (IP **salée puis hachée**, jamais en clair), écrite avec
  la clé service role. **Seuls les essais avec un jeton invalide comptent** (30 par 10 min et par IP) : une salle de
  classe partage une IP, un jeton valide n'est jamais compté ni bloqué. Purge des lignes de plus d'un jour à chaque
  écriture. Si le compteur est indisponible, personne n'est bloqué (la limite protège du bruit ; deviner un jeton de
  256 bits est impossible).
- **IP lue dans l'en-tête posé par la plateforme** (`x-real-ip`, sinon premier `x-forwarded-for`), jamais dans un
  paramètre fourni par le client. En production sur Vercel, ces en-têtes sont posés par la plateforme (un en-tête envoyé
  par le client est écrasé) ; en local, ils sont modifiables, ce que les tests e2e exploitent pour simuler des IP.

## En-têtes et cache

`/q/*` : `Referrer-Policy: no-referrer` (le jeton est dans l'URL), `Cache-Control: no-store`, `X-Robots-Tag: noindex`.
Le proxy n'appelle pas l'authentification sur `/q/` (aucune session à rafraîchir).

## Tests d'abus (`e2e/quiz-security.spec.ts`, `src/lib/quiz/*.test.ts`)

Lecture / écriture / suppression anonymes de 8 tables (rien ne change) ; fonctions internes non appelables ; jetons mal
formés, inconnus, injection SQL, jeton en clair à la place du haché ; fenêtre non ouverte / fermée ; réponses hostiles
(clés hors bornes, `__proto__`, taille) ; sauvegarde tardive ; soumission tardive et double ; débit par jeton (save non
limité) ; lien révoqué ; corrigé caché tant que le rattrapage n'est pas clôturé ; limite par IP avec jeton valide
non bloqué ; aucune donnée d'autres étudiant·es ni indice de correction dans la page (`e2e/quiz.spec.ts`).

## Limites connues

- Le lien est un secret porteur : qui l'a peut passer la copie. D'où « Ce lien est personnel : ne le partage pas ».
- Un·e étudiant·e peut ouvrir deux onglets : la dernière sauvegarde gagne (pas de verrou d'onglet).
- L'heure limite est vérifiée à l'enregistrement, pas interrompue en direct : la remise automatique à 0 est faite
  par le navigateur ; un navigateur fermé laisse la copie « en cours » jusqu'à ce que Marie la rende ou clôture le QCM
  (les réponses enregistrées sont alors corrigées).

## Lien de classe et choix du nom (US-155)

Seconde surface publique : `/q/classe/[token]`. Marie projette un QR code ; chaque étudiant·e choisit son nom et reçoit
son lien personnel.

- **Lien de classe** : 256 bits aléatoires ; haché SHA-256 pour la recherche, jeton en clair gardé dans
  `quiz_class_link.token` (RLS propriétaire, aucun droit `anon`) pour que Marie reprojette le QR. Un seul lien actif par
  QCM ; « Remplacer » révoque l'ancien.
- **Ce que la page publique expose** (fonction `mg_quiz_class_names`) : le titre du QCM et les **noms (prénom + nom) des
  copies encore libres de CE QCM**, avec un identifiant de copie aléatoire (UUID). Rien d'autre : ni note, ni tirage, ni
  e-mail, ni noms déjà pris. Rien du tout hors fenêtre du QCM publié (« pas encore ouvert » / « fermé »).
- **Prise d'un nom** (`mg_quiz_class_claim`) : atomique (contrainte d'unicité sur `quiz_claim.attempt_id`) ; seulement
  pour une copie « prête » (non commencée) ; pose un **nouveau jeton** (généré côté serveur, haché en base, renvoyé
  une seule fois par redirection) : un lien envoyé auparavant cesse de fonctionner. Un nom pris disparaît de la liste.
- **Libération** par Marie (copie non commencée seulement) : le jeton est remplacé par un jeton jeté, le nom revient.
- **Limite par IP** : les liens de classe invalides comptent dans la même limite que les jetons invalides.
- **Risque assumé** : quiconque a le QR peut prendre un nom libre pendant la fenêtre (usurpation possible par une
  personne présente). Atténuation : QR projeté en classe, fenêtre du QCM, liste des noms pris visible par Marie, nom
  libérable. Marie peut aussi arrêter ou remplacer le QR à tout moment.
