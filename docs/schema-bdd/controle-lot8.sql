-- Contrôle du lot 8 (facture). LECTURE SEULE : uniquement des SELECT.
-- AVANT puis APRÈS `db push`. Seule la requête 1 change (déclencheur présent après).

\pset null '∅'

\echo '== 1. Garde-fou de suppression (après : 1 ligne, enabled = O)'
select tgname, tgenabled as enabled from pg_trigger
where tgname = 'invoice_guard_delete' and tgrelid = 'public.invoice'::regclass;

\echo '== 2. Une facture par module (index unique attendu : invoice_module_uidx)'
select indexname, indexdef from pg_indexes
where schemaname = 'public' and tablename = 'invoice' and indexdef ilike '%unique%';

\echo '== 3. Factures (0 attendue au 12/11) et numéros'
select i.number, i.status, m.name as module from public.invoice i
join public.module m on m.id = i.module_id order by i.number;

\echo '== 4. Envoyée / payée : la source unique (iceberg_state) et les traces annexes, par module'
select m.name, m.year, m.iceberg_state,
       case when m.iceberg_state = 'paid' then 'payée'
            when m.iceberg_state in ('invoice_sent') then 'envoyée'
            else '—' end as facture_selon_appli,
       it.sent_on, it.paid_on,
       (select count(*) from public.module_document d
         where d.module_id = m.id and d.kind = 'external_invoice') as pdf_factures
from public.module m
left join public.invoice_tracking it on it.module_id = m.id
order by m.year, m.name;

\echo '== 5. Dates gardées alors que la case est décochée (normal depuis le 12/11 : décocher garde la date)'
select m.name, m.year, m.iceberg_state, it.sent_on, it.paid_on
from public.module m
left join public.invoice_tracking it on it.module_id = m.id
where (it.paid_on is not null and m.iceberg_state <> 'paid')
   or (it.sent_on is not null and m.iceberg_state not in ('invoice_sent', 'paid'));

\echo '== Empreinte des notes : nombre et somme par module (doit être identique)'
select m.name as module, m.year,
       count(g.id) filter (where g.value is not null) as nb_notes,
       coalesce(sum(g.value), 0) as somme_notes,
       count(g.id) as nb_copies
from public.module m
left join public.assessment a on a.module_id = m.id
left join public.grade g on g.assessment_id = a.id
group by m.id, m.name, m.year
order by m.year, m.name;
