-- Copies the 완료 rows of public.quizzes into the versioned lt_* structure as revision 1.
-- Reads public.quizzes only; it is not modified. Run once, after 202610160002.
-- One category = one quiz (tab). Option ids are option1..option5, matching the feedback keys.
-- To publish an edited copy later, change revision 1 below to 2 (or higher) and keep everything else.
begin;

insert into public.lt_question_versions
  (question_key, revision, kind, prompt, options, correct_option, correct_options, hint, feedback, explanation, points)
select 'quizzes-' || q.id, 1,
  case when x.e->>'type' = 'multi_select' then 'multi_choice' else 'single_choice' end,
  q.question,
  (select jsonb_agg(jsonb_build_object('id', 'option' || v.n, 'text', v.txt) order by v.n)
     from (values (1,q.option1),(2,q.option2),(3,q.option3),(4,q.option4),(5,q.option5)) v(n,txt)
     where v.txt is not null and btrim(v.txt) <> ''),
  case when x.e->>'type' <> 'multi_select' then 'option' || substring(q.answer from '([1-5])') end,
  case when x.e->>'type' = 'multi_select'
    then (select jsonb_agg('option' || m[1] order by m[1]) from regexp_matches(q.answer, '선택지\s*([1-5])', 'g') m) end,
  x.e->>'hint', x.e->'feedback', coalesce(x.e->>'correct_explanation', ''), 1
from public.quizzes q
cross join lateral (select q.explanation::jsonb as e) x
where q.status = '완료';

insert into public.lt_quiz_versions(quiz_key, revision, title, is_test, published)
select 'topic-' || lpad(c.rn::text, 2, '0'), 1, c.category, false, false
from (select category, row_number() over (order by min(id)) as rn
      from public.quizzes where status = '완료' group by category) c;

with cats as (
  select category, 'topic-' || lpad((row_number() over (order by min(id)))::text, 2, '0') as quiz_key
  from public.quizzes where status = '완료' group by category)
insert into public.lt_quiz_items(quiz_version_id, question_version_id, position)
select qv.id, qq.id, row_number() over (partition by qv.id order by q.id)
from public.quizzes q
join cats on cats.category = q.category
join public.lt_quiz_versions qv on qv.quiz_key = cats.quiz_key and qv.revision = 1
join public.lt_question_versions qq on qq.question_key = 'quizzes-' || q.id and qq.revision = 1
where q.status = '완료';

update public.lt_quiz_versions set published = true where quiz_key like 'topic-%' and revision = 1;
-- Hide the test-only sample quiz from the site (its stored records are kept).
update public.lt_quiz_versions set listed = false where quiz_key = 'test-sample';

commit;

-- Check: expect 7 rows, 7 questions each.
select v.quiz_key, v.title, v.published, v.listed, count(i.*) as questions
from public.lt_quiz_versions v left join public.lt_quiz_items i on i.quiz_version_id = v.id
group by v.quiz_key, v.title, v.published, v.listed order by v.quiz_key;
