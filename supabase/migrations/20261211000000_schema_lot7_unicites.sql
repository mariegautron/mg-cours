-- Schéma BDD, lot 7 : unicités.
--
-- CE QUE FAIT LA MIGRATION :
--   Le diagnostic du 12 nov. 2026 (section 5) n'a trouvé AUCUN doublon. Si un doublon était
--   apparu depuis, la création échoue et TOUTE la migration est annulée (rien n'est appliqué).
--   - Attendus : un seul attendu par module, type et libellé (casse et espaces de bord ignorés).
--     Index unique sur expression `module_expectation (module_id, kind, lower(btrim(label)))`.
--     L'appli répond « Cet attendu existe déjà. ».
--   - Séances : un seul rang par module, `course (module_id, position)`, contrainte DEFERRABLE
--     INITIALLY DEFERRED (vérifiée en fin de transaction). Le code de réordonnancement passe par
--     des rangs négatifs provisoires, donc il ne crée jamais de doublon, même transitoire.
--   Aucune ligne modifiée, aucune note touchée. Rejouable.
--
-- CE QUI CHANGE POUR MARIE : rien de visible, sauf le message « Cet attendu existe déjà. » si elle
-- ajoute deux fois le même attendu. Une fiche d'école qui répète un attendu ne le crée qu'une fois.
--
-- RETOUR ARRIÈRE :
--   drop index if exists public.module_expectation_label_uidx;
--   alter table public.course drop constraint if exists course_module_position_key;
--
-- Contrôle (lecture seule) : docs/schema-bdd/controle-lot7.sql

create unique index if not exists module_expectation_label_uidx
  on public.module_expectation (module_id, kind, lower(btrim(label)));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'course_module_position_key') then
    alter table public.course
      add constraint course_module_position_key unique (module_id, position)
      deferrable initially deferred;
  end if;
end;
$$;
