-- Schéma BDD, lot 1 : conventions communes sur les 4 tables qui y échappaient.
--
-- CE QUE FAIT LA MIGRATION (purement additive, rejouable) :
--   - ajoute `updated_at timestamptz not null default now()` à assessment_expectation,
--     expectation_dismissal, expectation_resource et quiz_question_criterion ;
--   - pose le déclencheur `set_updated_at` (extensions.moddatetime) sur les trois premières.
--     quiz_question_criterion l'avait déjà (mg_apply_conventions, 20261119000000) mais SANS la
--     colonne : toute mise à jour d'une de ses lignes aurait échoué. La colonne répare ce défaut ;
--   - pose la politique standard `mg_owner_all` (rôle authenticated, owner_id = auth.uid()) sur
--     les trois premières. Leurs anciennes politiques (« *_owner ») font la même chose : elles
--     sont GARDÉES (aucun drop dans ce lot), leur suppression est prévue au lot 9.
--   La RLS est déjà activée sur les 4 tables. Aucune ligne n'est modifiée, aucune note touchée.
--
-- CE QUI CHANGE POUR MARIE : rien de visible. Les droits restent « chacun ne voit que ses
-- données ». Un éventuel futur écran qui modifierait un critère de question ne plantera plus.
--
-- RETOUR ARRIÈRE :
--   drop policy if exists mg_owner_all on public.assessment_expectation;
--   drop policy if exists mg_owner_all on public.expectation_dismissal;
--   drop policy if exists mg_owner_all on public.expectation_resource;
--   drop trigger if exists set_updated_at on public.assessment_expectation;
--   drop trigger if exists set_updated_at on public.expectation_dismissal;
--   drop trigger if exists set_updated_at on public.expectation_resource;
--   alter table public.assessment_expectation drop column if exists updated_at;
--   alter table public.expectation_dismissal drop column if exists updated_at;
--   alter table public.expectation_resource drop column if exists updated_at;
--   -- quiz_question_criterion : NE PAS retirer la colonne (son déclencheur en a besoin).
--
-- Contrôle (lecture seule) : docs/schema-bdd/controle-lot1.sql

alter table public.assessment_expectation
  add column if not exists updated_at timestamptz not null default now();
alter table public.expectation_dismissal
  add column if not exists updated_at timestamptz not null default now();
alter table public.expectation_resource
  add column if not exists updated_at timestamptz not null default now();
alter table public.quiz_question_criterion
  add column if not exists updated_at timestamptz not null default now();

do $$
declare
  t text;
begin
  foreach t in array array['assessment_expectation', 'expectation_dismissal', 'expectation_resource'] loop
    execute format('alter table public.%I enable row level security', t);

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public' and tablename = t and policyname = 'mg_owner_all'
    ) then
      execute format(
        'create policy mg_owner_all on public.%I for all to authenticated '
        || 'using (owner_id = (select auth.uid())) '
        || 'with check (owner_id = (select auth.uid()))',
        t
      );
    end if;

    if not exists (
      select 1 from pg_trigger
      where tgrelid = format('public.%I', t)::regclass
        and tgname = 'set_updated_at'
        and not tgisinternal
    ) then
      execute format(
        'create trigger set_updated_at before update on public.%I '
        || 'for each row execute function extensions.moddatetime(updated_at)',
        t
      );
    end if;
  end loop;
end;
$$;
