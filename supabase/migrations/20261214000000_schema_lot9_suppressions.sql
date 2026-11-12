-- Schéma BDD, lot 9 : suppressions validées par Arnaud le 12 nov. 2026 (« oui ok avec la liste
-- des suppressions »), d'après docs/schema-bdd/lot9-candidats.md.
--
-- PRÉALABLES (dans cet ordre) : sauvegarde CSV (docs/schema-bdd/sauvegarde-lot9.sql), contrôle
-- avant (docs/schema-bdd/controle-lot9.sql). Le code en ligne ne lit ni n'écrit plus aucune de
-- ces colonnes (lots 6 et 9, déployés) : aucun push de code n'est nécessaire avant.
--
-- CE QUE FAIT LA MIGRATION :
--   1. GARDES : la migration échoue en entier (rien n'est supprimé) si
--      - une personne a une promotion dans student.scholar_group mais AUCUNE dans student_year ;
--      - une donnée réelle traîne encore dans une colonne censée être vide : course.slides,
--        student.photo_url, open_review.proposals, invoice.pdf_path / xml_path, ou une ligne dans
--        project_submission.
--   2. Supprime les anciennes politiques « *_owner » (équivalentes à mg_owner_all, posée au lot 1)
--      de assessment_expectation, expectation_dismissal et expectation_resource.
--   3. Supprime les colonnes : course.slides, student.photo_url, student.scholar_group,
--      open_review.proposals, invoice.pdf_path, invoice.xml_path, grade.is_group_grade,
--      assessment.coefficient (sa contrainte assessment_coefficient_pos_ck part avec elle),
--      assessment.submission_mode.
--   4. Supprime la table project_submission (vide, remplacée par submission_item).
--   La migration est rejouable (if exists partout). Supabase l'applique dans une seule
--   transaction : une erreur annule tout.
--   GARDÉS : exam_kind, subject_versions, makeup_prepared, pedagogical_outline.pdf_path,
--   import_ref, hours_lecture / hours_td / hours_tp.
--
-- CE QUI CHANGE POUR MARIE : rien de visible (colonnes déjà ignorées par l'appli). L'export complet
-- n'a plus ces colonnes.
--
-- RETOUR ARRIÈRE (structure ; les valeurs se restaurent depuis les CSV de ~/sauvegarde-lot9) :
--   alter table public.course add column slides jsonb not null default '[]';
--   alter table public.student add column photo_url text, add column scholar_group text;
--   alter table public.open_review add column proposals jsonb;
--   alter table public.invoice add column pdf_path text, add column xml_path text;
--   alter table public.grade add column is_group_grade boolean not null default false;
--   alter table public.assessment add column coefficient numeric(5, 2) not null default 1,
--     add column submission_mode text check (submission_mode in ('app', 'manual'));
--   alter table public.assessment add constraint assessment_coefficient_pos_ck check (coefficient > 0);
--   create table public.project_submission ( … ) : reprendre 20261013000000_project_submission.sql ;
--   create policy … : reprendre 20261103000000, 20261105000000 et 20261110000000 (ou politiques_owner.csv).
--   Restauration d'une colonne, ex. scholar_group (psql) :
--     create temp table t (id uuid, last_name text, first_name text, scholar_group text);
--     \copy t from 'student_scholar_group.csv' csv header
--     update public.student s set scholar_group = t.scholar_group from t where t.id = s.id;
--   Puis : supabase migration repair --status reverted 20261214000000
--
-- Contrôle (lecture seule) : docs/schema-bdd/controle-lot9.sql

-- ── 1. Gardes ──────────────────────────────────────────────────────────────────────────────────
do $$
declare
  v bigint;
  has_col boolean;
begin
  -- Promotions : aucune ne doit exister seulement dans student.scholar_group.
  select exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'student' and column_name = 'scholar_group')
    into has_col;
  if has_col then
    execute $q$
      select count(*) from public.student s
      where coalesce(btrim(s.scholar_group), '') <> ''
        and not exists (select 1 from public.student_year y
                        where y.student_id = s.id and coalesce(btrim(y.scholar_group), '') <> '')
    $q$ into v;
    if v > 0 then
      raise exception '% étudiant·e(s) ont une promotion dans student.scholar_group et aucune dans student_year : rien n''est supprimé.', v;
    end if;
  end if;

  -- Les anciennes politiques ne partent que si mg_owner_all (lot 1) les remplace déjà.
  select count(*) into v from pg_policies
  where schemaname = 'public' and policyname = 'mg_owner_all'
    and tablename in ('assessment_expectation', 'expectation_dismissal', 'expectation_resource');
  if v < 3 then
    raise exception 'mg_owner_all manque sur % table(s) : rien n''est supprimé.', 3 - v;
  end if;

  -- Colonnes censées être vides.
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'course' and column_name = 'slides') then
    execute $q$ select count(*) from public.course where slides <> '[]'::jsonb $q$ into v;
    if v > 0 then raise exception 'course.slides : % ligne(s) remplie(s), rien n''est supprimé.', v; end if;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'student' and column_name = 'photo_url') then
    execute $q$ select count(*) from public.student where coalesce(btrim(photo_url), '') <> '' $q$ into v;
    if v > 0 then raise exception 'student.photo_url : % ligne(s) remplie(s), rien n''est supprimé.', v; end if;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'open_review' and column_name = 'proposals') then
    execute $q$ select count(*) from public.open_review where proposals is not null $q$ into v;
    if v > 0 then raise exception 'open_review.proposals : % ligne(s) remplie(s), rien n''est supprimé.', v; end if;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'invoice' and column_name = 'pdf_path') then
    execute $q$ select count(*) from public.invoice where pdf_path is not null or xml_path is not null $q$ into v;
    if v > 0 then raise exception 'invoice.pdf_path / xml_path : % ligne(s) remplie(s), rien n''est supprimé.', v; end if;
  end if;
  if to_regclass('public.project_submission') is not null then
    execute $q$ select count(*) from public.project_submission $q$ into v;
    if v > 0 then raise exception 'project_submission : % ligne(s), rien n''est supprimé.', v; end if;
  end if;
end;
$$;

-- ── 2. Anciennes politiques (doublons de mg_owner_all) ─────────────────────────────────────────
drop policy if exists assessment_expectation_owner on public.assessment_expectation;
drop policy if exists expectation_dismissal_owner on public.expectation_dismissal;
drop policy if exists expectation_resource_owner on public.expectation_resource;

-- ── 3. Colonnes ────────────────────────────────────────────────────────────────────────────────
alter table public.course drop column if exists slides;
alter table public.student drop column if exists photo_url;
alter table public.student drop column if exists scholar_group;
alter table public.open_review drop column if exists proposals;
alter table public.invoice drop column if exists pdf_path;
alter table public.invoice drop column if exists xml_path;
alter table public.grade drop column if exists is_group_grade;
alter table public.assessment drop column if exists coefficient;
alter table public.assessment drop column if exists submission_mode;

-- ── 4. Table ───────────────────────────────────────────────────────────────────────────────────
drop table if exists public.project_submission;
