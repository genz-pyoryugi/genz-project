import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const bank = JSON.parse(read('src/app/calendar/quiz-bank.json'));
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const schema = read('supabase/migrations/202610160001_calendar_quiz.sql');
const seed = read('supabase/seed-calendar-quiz.sql');
let submit = schema.slice(schema.indexOf('create function public.submit_calendar_quiz'), schema.lastIndexOf('commit;')).trim();
submit = submit.replace('create function public.submit_calendar_quiz', 'create or replace function public.submit_calendar_quiz');
submit = submit.replace('-- Lock the full active chapter so edits cannot change the grade part way through.', '-- Lock the bank during grading; each attempt submits exactly three distinct active questions.');
submit = submit.replace('select count(*) into v_count from public.calendar_quiz_questions where chapter = p_chapter and active;', 'v_count := 3;');
submit = submit.replace('if v_count = 0 or pg_catalog.jsonb_array_length(p_responses) <> v_count then', 'if pg_catalog.jsonb_array_length(p_responses) <> v_count then');
submit = submit.replace('Submit every question in this chapter', 'Submit exactly three questions');
submit = submit.replace(') order by q.position)', ') order by response.position)');
submit = submit.replace('from pg_catalog.jsonb_array_elements(p_responses) r\n  join', 'from pg_catalog.jsonb_array_elements(p_responses) with ordinality response(r, position)\n  join');
// Normalize line endings before substitutions when the source came from a Windows checkout.
if (!submit.includes('with ordinality')) {
  submit = submit.replace(/from pg_catalog.jsonb_array_elements\(p_responses\) r\r?\n  join/, 'from pg_catalog.jsonb_array_elements(p_responses) with ordinality response(r, position)\n  join');
}
const insert = `insert into public.calendar_quiz_questions (id, chapter, position, quiz, answer, explanation, source) values\n${bank.map(q => `(${quote(q.id)}, ${q.chapter}, ${q.position}, ${quote(q.quiz)}, ${q.answer}, ${quote(q.explanation)}, ${quote(q.source)})`).join(',\n')}\non conflict (id) do nothing;`;
const upgrade = `-- Apply once to an existing calendar database; rerunning preserves question edits and attempts.\n-- PDF source: public/calendar/source.pdf, general-worker rules, articles 23-63.\nbegin;\n\n${submit}\n\n${insert}\n\ncommit;\n`;
fs.writeFileSync(new URL('supabase/migrations/202610200001_random_calendar_quiz.sql', root), upgrade);
const originalInsert = seed.slice(seed.indexOf('insert into'), seed.lastIndexOf('commit;')).trim();
const retry = read('supabase/migrations/202610200002_quiz_retry_wrong.sql');
const retryBody = retry.slice(retry.indexOf('begin;') + 'begin;'.length, retry.lastIndexOf('commit;'));
fs.writeFileSync(new URL('supabase/setup-calendar-quiz.sql', root), `-- Initial setup only: 36-question bank, policies and grading in one transaction.\n${schema.slice(0, schema.lastIndexOf('commit;'))}\n${originalInsert}\n\n${submit}\n\n${insert}\n${retryBody}\ncommit;\n`);
// One file for existing projects, including those that have not added the bank yet.
const bankBody = upgrade.slice(upgrade.indexOf('begin;') + 'begin;'.length, upgrade.lastIndexOf('commit;'));
fs.writeFileSync(new URL('supabase/update-calendar-quiz.sql', root), `-- Existing calendar database: apply bank expansion and wrong-answer retries together.\n-- Existing attempts are preserved. Safe to rerun. Do not use initial setup on an existing DB.\nbegin;\n${bankBody}\n${retryBody}\ncommit;\n`);
console.log(`Prepared bank upgrade: ${bank.length} new questions, 36 in total. No remote database writes.`);
