-- TEST-ONLY placeholder quiz so the save flow can be exercised before real questions exist.
-- Run after the migration. Safe to run once; it only inserts new rows.
-- Real content: see supabase/README.md ("실제 문제 넣기").
begin;
with qv as (
  insert into public.lt_quiz_versions(quiz_key, revision, title, is_test, published)
  values ('test-sample', 1, '[테스트용] 임시 퀴즈', true, false) returning id
), q as (
  insert into public.lt_question_versions(question_key, revision, kind, prompt, options, correct_option, explanation) values
  ('test-q1', 1, 'single_choice', '[테스트용] 첫 번째 임시 문제입니다. 정답은 B입니다.',
   '[{"id":"a","text":"선택지 A"},{"id":"b","text":"선택지 B (정답)"},{"id":"c","text":"선택지 C"}]', 'b', '테스트용 해설입니다. 실제 문제로 교체될 예정입니다.'),
  ('test-q2', 1, 'single_choice', '[테스트용] 두 번째 임시 문제입니다. 정답은 A입니다.',
   '[{"id":"a","text":"선택지 A (정답)"},{"id":"b","text":"선택지 B"},{"id":"c","text":"선택지 C"},{"id":"d","text":"선택지 D"}]', 'a', '테스트용 해설입니다.'),
  ('test-q3', 1, 'single_choice', '[테스트용] 세 번째 임시 문제입니다. 정답은 C입니다.',
   '[{"id":"a","text":"선택지 A"},{"id":"b","text":"선택지 B"},{"id":"c","text":"선택지 C (정답)"}]', 'c', '테스트용 해설입니다.')
  returning id, question_key
), items as (
  insert into public.lt_quiz_items(quiz_version_id, question_version_id, position)
  select qv.id, q.id, row_number() over (order by q.question_key) from qv, q returning 1
)
select count(*) from items;
update public.lt_quiz_versions set published = true where quiz_key = 'test-sample' and revision = 1;
commit;
