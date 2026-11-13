-- « Masquer d'Aujourd'hui » : une vraie colonne sur `module` (lot 6 UX/UI, point 28).
--
-- Contexte : la nuit du 12 au 13 nov. 2026, sans migration permise, le réglage a été rangé
-- provisoirement dans `module.admin_docs` sous la clé `hidden_from_today`.
--
-- CE QUE FAIT LA MIGRATION :
--   1. ajoute `module.hidden_from_today` (booléen, faux par défaut) ;
--   2. recopie la clé provisoire : vrai pour les modules où `admin_docs.hidden_from_today` = true ;
--   3. retire la clé provisoire de `admin_docs` (les autres clés ne bougent pas).
-- Rejouable sans effet (if not exists, mise à jour seulement des lignes qui portent la clé).
--
-- CE QUI CHANGE POUR MARIE : rien de visible ; un module masqué reste masqué.

alter table public.module
  add column if not exists hidden_from_today boolean not null default false;

comment on column public.module.hidden_from_today is
  'Masqué du tableau de bord « Aujourd''hui » (modules de test…) : ne compte ni dans les séances, ni dans À corriger, ni dans À faire.';

update public.module
set hidden_from_today = true
where (admin_docs ->> 'hidden_from_today') = 'true';

update public.module
set admin_docs = admin_docs - 'hidden_from_today'
where admin_docs ? 'hidden_from_today';
