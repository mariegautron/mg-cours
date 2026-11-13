-- Contrôle de la migration « Masquer d'Aujourd'hui ». LECTURE SEULE : uniquement des SELECT.
-- AVANT `db push` : la requête 1 échoue (colonne absente) ; la 2 liste les modules masqués
-- par la clé provisoire. APRÈS : la 1 liste les mêmes modules, la 2 ne renvoie plus rien.

\pset null '∅'

\echo '== 1. Modules masqués (colonne)'
select name, year from public.module where hidden_from_today order by name;

\echo '== 2. Clé provisoire restante dans admin_docs (après : 0 ligne)'
select name, year from public.module where admin_docs ? 'hidden_from_today' order by name;
