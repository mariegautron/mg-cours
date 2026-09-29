-- US-80b : promotion par année scolaire. `student.scholar_group` était un texte sans année, écrasé
-- d'une année sur l'autre ; `student_year` garde la promotion de chaque année (year = année de
-- rentrée, 2025 → « 2025-26 »). La colonne `student.scholar_group` est conservée (dépréciée) : elle
-- n'est plus lue ni écrite par l'application.
create table public.student_year (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  student_id uuid not null references public.student (id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  scholar_group text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, year)
);

create index student_year_year_idx on public.student_year (year, scholar_group);

select public.mg_apply_conventions(array['student_year']);

-- Reprise de l'existant : la promotion actuelle est rattachée à l'année la plus probable, celle des
-- modules où l'étudiant·e a un groupe (la plus fréquente, à égalité la plus récente) ; sans groupe,
-- l'année scolaire en cours (rentrée en août).
with current_year as (
  select case
    when extract(month from now()) >= 8 then extract(year from now())::int
    else extract(year from now())::int - 1
  end as y
),
group_years as (
  select gm.student_id, m.year, count(*) as n
  from public.group_member gm
  join public.student_group g on g.id = gm.student_group_id
  join public.module m on m.id = g.module_id
  group by gm.student_id, m.year
),
best as (
  select distinct on (student_id) student_id, year
  from group_years
  order by student_id, n desc, year desc
)
insert into public.student_year (owner_id, student_id, year, scholar_group)
select s.owner_id, s.id, coalesce(b.year, (select y from current_year)), trim(s.scholar_group)
from public.student s
left join best b on b.student_id = s.id
where nullif(trim(s.scholar_group), '') is not null
on conflict (student_id, year) do nothing;
