-- Schéma BDD, lot 5 (2/2) : remplissage de `assessment.kind`.
--
-- CE QUE FAIT LA MIGRATION :
--   classe chaque évaluation SANS kind (rejouable : une valeur déjà posée n'est jamais
--   réécrite) selon cet ordre de priorité :
--     1. type exactement « Note de l'école »                         → school_grade
--     2. type contenant « point d'étape » / « étape »                → progress_review
--     3. QCM (le sien ou celui de l'original) en correction « questions ouvertes »,
--        ou type contenant « question(s) ouverte(s) »                → open_questions
--     4. exam_kind déjà choisi (qcm, oral, in_class, files)          → quiz, oral, in_class, files
--     5. sinon d'après le texte du type (accents et casse ignorés) :
--        qcm / quiz → quiz ; oral → oral ; en classe / sur table / écrit → in_class ;
--        rendu / fichier / lien / projet / dossier / dépôt / spécifications → files
--     6. sinon                                                       → other
--   La même expression est dans docs/schema-bdd/controle-lot5.sql (requête 1), qui liste chaque
--   évaluation avec son kind proposé AVANT de pousser. Ne touche ni type, ni exam_kind, ni notes.
--
-- CE QUI CHANGE POUR MARIE : rien (colonne pas encore lue par l'appli).
--
-- RETOUR ARRIÈRE : update public.assessment set kind = null;
--   (sans perte : rien d'autre n'est écrit par cette migration)
--
-- Contrôle (lecture seule) : docs/schema-bdd/controle-lot5.sql

update public.assessment a
set kind = (case
      when btrim(a.type) = 'Note de l''école' then 'school_grade'
      when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '(point d.etape|\metape\M)'
        then 'progress_review'
      when exists (select 1 from public.quiz q
                   where q.assessment_id in (a.id, a.makeup_of_id)
                     and q.correction_mode = 'open_questions')
        or translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ 'questions? ouvertes?'
        then 'open_questions'
      when a.exam_kind = 'qcm' then 'quiz'
      when a.exam_kind = 'oral' then 'oral'
      when a.exam_kind = 'in_class' then 'in_class'
      when a.exam_kind = 'files' then 'files'
      when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '\m(qcm|quiz)\M' then 'quiz'
      when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '\moral\M' then 'oral'
      when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '(en classe|sur table|\mecrit\M)' then 'in_class'
      when translate(lower(coalesce(a.type, '')), 'éèêëàâäîïôöûüç’', 'eeeeaaaiioouuc''') ~ '\m(rendu|fichiers?|liens?|projet|dossier|depot|specifications?)\M' then 'files'
      else 'other'
    end)::public.assessment_kind
where a.kind is null;
