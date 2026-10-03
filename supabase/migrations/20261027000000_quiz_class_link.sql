-- US-155 — Accès au QCM par un lien de classe (QR code) et choix du nom.
--
-- Marie projette UN lien / QR par QCM ; chaque étudiant·e ouvre la page, choisit son nom dans la
-- liste des noms encore libres de CE QCM, et reçoit alors son lien personnel (nouveau jeton : un
-- éventuel lien envoyé auparavant cesse de fonctionner). Un nom pris disparaît de la liste ; Marie
-- peut le libérer tant que la copie n'est pas commencée.
--
-- SÉCURITÉ (même modèle que `quiz`, voir docs/SECURITY-QCM.md) :
--  · tables sans aucun droit pour `anon`, RLS propriétaire ;
--  · l'anonyme n'exécute que DEUX fonctions `security definer` : `mg_quiz_class_names` (renvoie le
--    titre du QCM et les NOMS libres de ce QCM, rien d'autre : ni note, ni tirage, ni e-mail) et
--    `mg_quiz_class_claim` (attribue un nom, une seule fois, dans la fenêtre du QCM publié) ;
--  · le lien de classe est un secret de 256 bits ; son haché sert à la recherche. Le jeton en clair
--    est gardé (réservé à Marie par la RLS) pour qu'elle puisse reprojeter le QR sans le recréer.
-- Nouvelles tables : sans elles, le QCM garde ses liens personnels et la page « QR » dit qu'elle arrive.

create table public.quiz_class_link (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  quiz_id uuid not null references public.quiz (id) on delete cascade,
  token text not null check (token ~ '^[A-Za-z0-9_-]{43}$'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index quiz_class_link_active_idx on public.quiz_class_link (quiz_id) where revoked_at is null;

create table public.quiz_claim (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  attempt_id uuid not null unique references public.quiz_attempt (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

select public.mg_apply_conventions(array['quiz_class_link', 'quiz_claim']);
revoke all on public.quiz_class_link, public.quiz_claim from anon;

-- Noms libres du QCM (copies prêtes, non révoquées, non attribuées), si le QCM est ouvert.
create function public.mg_quiz_class_names(p_link_hash text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  l public.quiz_class_link%rowtype;
  q public.quiz%rowtype;
begin
  if p_link_hash is null or p_link_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into l from public.quiz_class_link where token_hash = p_link_hash and revoked_at is null;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  select * into q from public.quiz where id = l.quiz_id;
  if q.status = 'draft' or (q.opens_at is not null and q.opens_at > now()) then
    return jsonb_build_object('status', 'not_open', 'title', q.title,
      'opens_at', case when q.status = 'published' then q.opens_at end);
  end if;
  if q.status = 'closed' or (q.closes_at is not null and q.closes_at <= now()) then
    return jsonb_build_object('status', 'window_closed', 'title', q.title);
  end if;
  return jsonb_build_object(
    'status', 'ok', 'title', q.title,
    'names', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'name', s.first_name || ' ' || s.last_name)
        order by lower(s.last_name), lower(s.first_name), a.id)
      from public.quiz_attempt a
      join public.student s on s.id = a.student_id
      where a.quiz_id = q.id and a.status = 'ready' and a.revoked_at is null
        and not exists (select 1 from public.quiz_claim c where c.attempt_id = a.id)
    ), '[]'::jsonb)
  );
end;
$$;

-- Attribue un nom : pose le nouveau jeton (haché) sur la copie. Une seule personne par nom.
create function public.mg_quiz_class_claim(p_link_hash text, p_attempt_id uuid, p_new_token_hash text)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  l public.quiz_class_link%rowtype;
  q public.quiz%rowtype;
  a public.quiz_attempt%rowtype;
  v_claim uuid;
begin
  if p_link_hash is null or p_link_hash !~ '^[0-9a-f]{64}$'
     or p_new_token_hash is null or p_new_token_hash !~ '^[0-9a-f]{64}$' or p_attempt_id is null then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into l from public.quiz_class_link where token_hash = p_link_hash and revoked_at is null;
  if not found then return jsonb_build_object('status', 'invalid'); end if;
  select * into q from public.quiz where id = l.quiz_id;
  if q.status <> 'published' or (q.opens_at is not null and q.opens_at > now())
     or (q.closes_at is not null and q.closes_at <= now()) then
    return jsonb_build_object('status', 'window_closed');
  end if;
  select * into a from public.quiz_attempt where id = p_attempt_id and quiz_id = q.id;
  if not found or a.revoked_at is not null or a.status <> 'ready' then
    return jsonb_build_object('status', 'taken');
  end if;
  insert into public.quiz_claim (owner_id, attempt_id) values (a.owner_id, a.id)
    on conflict (attempt_id) do nothing returning id into v_claim;
  if v_claim is null then return jsonb_build_object('status', 'taken'); end if;
  update public.quiz_attempt set token_hash = p_new_token_hash, sent_at = null where id = a.id;
  return jsonb_build_object('status', 'ok');
end;
$$;

revoke all on function public.mg_quiz_class_names(text) from public, anon, authenticated;
revoke all on function public.mg_quiz_class_claim(text, uuid, text) from public, anon, authenticated;
grant execute on function public.mg_quiz_class_names(text) to anon;
grant execute on function public.mg_quiz_class_claim(text, uuid, text) to anon;
