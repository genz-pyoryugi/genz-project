const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');

test('PostgreSQL migrations, RLS, attempts and reporting', { timeout: 120000 }, async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users(id uuid primary key,is_anonymous boolean not null default true);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;
  `);
  for (const name of ['202610160001_learning_tracking.sql', '202610160002_multi_choice_and_listing.sql']) {
    await db.exec(readFileSync(`supabase/migrations/${name}`, 'utf8'));
  }
  const userA = randomUUID(), userB = randomUUID(), admin = randomUUID();
  const quiz = randomUUID(), revised = randomUUID(), q1 = randomUUID(), q2 = randomUUID(), q3 = randomUUID();
  const visitA = randomUUID(), visitB = randomUUID();
  await db.query('insert into auth.users values ($1,true),($2,true),($3,false)', [userA, userB, admin]);
  await db.query(`insert into public.lt_quiz_versions(id,quiz_key,revision,title) values
    ($1,'work',1,'업무 절차&기준'),($2,'work',2,'업무 절차&기준')`, [quiz, revised]);
  await db.query(`insert into public.lt_question_versions(id,question_key,revision,kind,prompt,options,correct_option,correct_options,explanation,points) values
    ($1,'one',1,'single_choice','문제 1','[{"id":"a","text":"정답"},{"id":"b","text":"오답"}]','a',null,'해설 1',2),
    ($2,'two',1,'multi_choice','문제 2','[{"id":"a","text":"보기 A"},{"id":"b","text":"보기 B"},{"id":"c","text":"보기 C"}]',null,'["a","b"]','해설 2',1),
    ($3,'three',1,'single_choice','새 문제','[{"id":"a","text":"예"},{"id":"b","text":"아니오"}]','a',null,'해설 3',1)`, [q1, q2, q3]);
  await db.query('insert into public.lt_quiz_items values($1,$3,1),($1,$4,2),($2,$3,1),($2,$5,2)', [quiz, revised, q1, q2, q3]);
  await db.exec('update public.lt_quiz_versions set published=true');
  const sequences = new Map();
  async function as(user, fn, role = 'authenticated') {
    await db.exec(`set role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user || '']);
    try { return await fn(); } finally { await db.exec('reset role'); }
  }
  function event(visit, type, fields = {}) {
    const sequence = (sequences.get(visit) || 0) + 1; sequences.set(visit, sequence);
    return { id: randomUUID(), visitId: visit, sequence, at: new Date(Date.UTC(2026, 9, 19, 5, 0, sequence)).toISOString(), type, ...fields };
  }
  const send = (user, e) => as(user, () => db.query('select public.lt_ingest($1::jsonb)', [JSON.stringify(e)]));
  const emit = (user, visit, type, fields) => send(user, event(visit, type, fields));
  const records = (user, args = {}) => as(user, async () => (await db.query(
    `select public.lt_records($1,$2,$3,$4,$5,$6,$7) as report`,
    [args.admin || false, args.from || null, args.to || null, args.topic || null, args.path || null, args.limit || 50, args.offset || 0],
  )).rows[0].report);
  const fullA = randomUUID();
  await emit(userA, visitA, 'visit_started');
  await emit(userA, visitA, 'first_choice', { choice: 'files' });
  await emit(userA, visitA, 'office_entered'); await emit(userA, visitA, 'cardnews_opened'); await emit(userA, visitA, 'quiz_opened');
  await emit(userA, visitA, 'quiz_started', { attemptId: fullA, quizVersionId: quiz });
  await emit(userA, visitA, 'answer_submitted', { attemptId: fullA, questionVersionId: q1, selectedOption: 'b' });
  await emit(userA, visitA, 'answer_submitted', { attemptId: fullA, questionVersionId: q2, selectedOption: 'b,a' });
  await emit(userA, visitA, 'quiz_completed', { attemptId: fullA });
  // Apply the new migration AFTER a historical completed attempt exists.
  await db.exec(readFileSync('supabase/migrations/202610200001_learning_history.sql', 'utf8'));
  await db.exec(readFileSync('supabase/migrations/202610200002_quiz_progress.sql', 'utf8'));
  await db.query('insert into public.lt_operators(user_id) values($1)', [admin]);

  await t.test('historical data and immutable versioned answers remain intact', async () => {
    assert.equal((await as(userA, () => db.query('select public.lt_learning_version() as version'))).rows[0].version, 3);
    const report = await records(userA);
    assert.equal(report.total, 1);
    assert.equal(report.attempts[0].mode, 'full');
    assert.equal(report.attempts[0].score, 1);
    assert.equal(report.attempts[0].max_score, 3);
    assert.equal(report.attempts[0].answers[0].selectedOption, 'b');
    assert.equal(report.attempts[0].answers[1].selectedOption, 'a,b');
    assert.equal(report.attempts[0].path, 'cardnews');
    assert.equal(report.attempts[0].first_choice, 'files');
  });
  const fullB = randomUUID();
  await emit(userB, visitB, 'visit_started'); await emit(userB, visitB, 'office_entered'); await emit(userB, visitB, 'quiz_opened');
  await emit(userB, visitB, 'quiz_started', { attemptId: fullB, quizVersionId: quiz });
  await emit(userB, visitB, 'answer_submitted', { attemptId: fullB, questionVersionId: q1, selectedOption: 'a' });
  await emit(userB, visitB, 'answer_submitted', { attemptId: fullB, questionVersionId: q2, selectedOption: 'a,b' });
  await emit(userB, visitB, 'quiz_completed', { attemptId: fullB });

  await t.test('different anonymous identities cannot read each other through tables, views or RPC', async () => {
    assert.equal((await records(userA)).total, 1);
    assert.equal((await records(userB)).total, 1);
    await as(userA, async () => {
      for (const table of ['lt_visits', 'lt_attempts', 'lt_answers', 'lt_events', 'lt_learning_records']) {
        const rows = await db.query(`select * from public.${table} where visitor_id=$1`, [userB]);
        assert.equal(rows.rows.length, 0, table);
      }
      assert.equal((await db.query('select * from public.lt_attempt_items where attempt_id=$1', [fullB])).rows.length, 0);
    });
    await assert.rejects(records(userA, { admin: true }), e => e.code === '42501');
    await assert.rejects(as(null, () => db.query('select public.lt_records()'), 'anon'), e => e.code === '42501');
    await assert.rejects(as(userA, () => db.query('update public.lt_attempts set score=999 where id=$1', [fullA])), e => e.code === '42501');
    await assert.rejects(as(userA, () => db.query('insert into public.lt_operators(user_id) values($1)', [userA])), e => e.code === '42501');
  });
  await t.test('operators can read all identities, revocation is immediate, anonymous appointment is ineffective', async () => {
    assert.equal((await records(admin, { admin: true })).total, 2);
    assert.equal((await records(admin)).total, 0); // Even operators' self-history is self-only.
    await db.query('delete from public.lt_operators where user_id=$1', [admin]);
    await assert.rejects(records(admin, { admin: true }), e => e.code === '42501');
    await db.query('insert into public.lt_operators(user_id) values($1),($2)', [admin, userA]);
    await assert.rejects(records(userA, { admin: true }), e => e.code === '42501');
    await db.query('delete from public.lt_operators where user_id=$1', [userA]);
  });
  const review = randomUUID();
  await t.test('review derives its exact wrong-question membership from an owned completed source', async () => {
    await assert.rejects(emit(userA, visitA, 'quiz_started', { attemptId: randomUUID(), quizVersionId: quiz, mode: 'review', sourceAttemptId: fullB }), /Invalid review source/);
    await emit(userA, visitA, 'quiz_started', { attemptId: review, quizVersionId: quiz, mode: 'review', sourceAttemptId: fullA });
    await assert.rejects(emit(userA, visitA, 'answer_submitted', { attemptId: review, questionVersionId: q2, selectedOption: 'a,b' }), /Question is not in review/);
    await emit(userA, visitA, 'answer_submitted', { attemptId: review, questionVersionId: q1, selectedOption: 'a' });
    await emit(userA, visitA, 'quiz_completed', { attemptId: review });
    const row = (await records(userA)).attempts.find(a => a.id === review);
    assert.equal(row.question_count, 1); assert.equal(row.correct_count, 1); assert.equal(row.score, 2);
    assert.equal(row.source_attempt_id, fullA); assert.equal(row.mode, 'review'); assert.equal(row.answers.length, 1);
    await assert.rejects(emit(userA, visitA, 'quiz_started', { attemptId: randomUUID(), quizVersionId: quiz, mode: 'review', sourceAttemptId: review }), /No wrong answers/);
  });
  const retake = randomUUID();
  await emit(userA, visitA, 'quiz_started', { attemptId: retake, quizVersionId: quiz, mode: 'full' });
  await t.test('duplicate events, starts, navigation/reload submissions and completions do not duplicate scores', async () => {
    const answer = event(visitA, 'answer_submitted', { attemptId: retake, questionVersionId: q1, selectedOption: 'a' });
    await send(userA, answer); await send(userA, answer);
    await assert.rejects(send(userA, { ...answer, selectedOption: 'b' }), /Event ID conflict/);
    await emit(userA, visitA, 'quiz_started', { attemptId: retake, quizVersionId: quiz, mode: 'full' });
    await emit(userA, visitA, 'answer_submitted', { attemptId: retake, questionVersionId: q1, selectedOption: 'a' });
    await assert.rejects(emit(userA, visitA, 'answer_submitted', { attemptId: retake, questionVersionId: q1, selectedOption: 'b' }), /Answer already submitted/);
    await assert.rejects(emit(userA, visitA, 'quiz_completed', { attemptId: retake }), /unanswered/);
    await emit(userA, visitA, 'answer_submitted', { attemptId: retake, questionVersionId: q2, selectedOption: 'a,b' });
    await emit(userA, visitA, 'quiz_completed', { attemptId: retake });
    await emit(userA, visitA, 'quiz_completed', { attemptId: retake });
    await emit(userA, visitA, 'answer_submitted', { attemptId: retake, questionVersionId: q1, selectedOption: 'a' });
    const row = (await records(userA)).attempts.find(a => a.id === retake);
    assert.equal(row.score, 3); assert.equal(row.correct_count, 2); assert.equal(row.answered_count, 2);
    assert.equal(row.answers.filter(a => a.selectedOption).length, 2);
  });
  const newVersion = randomUUID();
  await emit(userA, visitA, 'quiz_started', { attemptId: newVersion, quizVersionId: revised });
  await emit(userA, visitA, 'answer_submitted', { attemptId: newVersion, questionVersionId: q1, selectedOption: 'a' });
  await emit(userA, visitA, 'answer_submitted', { attemptId: newVersion, questionVersionId: q3, selectedOption: 'a' });
  await emit(userA, visitA, 'quiz_completed', { attemptId: newVersion });
  const incomplete = randomUUID();
  await emit(userA, visitA, 'quiz_started', { attemptId: incomplete, quizVersionId: quiz });
  await emit(userA, visitA, 'answer_submitted', { attemptId: incomplete, questionVersionId: q1, selectedOption: 'b' });
  await t.test('first/recent comparisons separate version, question membership, review and incomplete runs', async () => {
    const report = await records(userA);
    const original = report.comparisons.find(c => c.quiz_version_id === quiz && c.mode === 'full');
    assert.equal(original.attempts, 2);
    assert.equal(original.first_correct, 1); assert.equal(original.latest_correct, 2);
    assert.equal(original.first_score, 1); assert.equal(original.latest_score, 3);
    assert.equal(report.comparisons.length, 3);
    assert.equal(report.comparisons.find(c => c.quiz_version_id === revised).attempts, 1);
    assert.equal(report.comparisons.find(c => c.mode === 'review').question_count, 1);
  });
  await t.test('date, topic, route and pagination filters and path denominators are accurate', async () => {
    const all = await records(admin, { admin: true });
    assert.equal(all.total, 6);
    const cardnews = all.paths.find(p => p.path === 'cardnews');
    assert.equal(cardnews.participants, 1); assert.equal(cardnews.attempts, 4); assert.equal(cardnews.completed_attempts, 3);
    assert.equal(Number(cardnews.completion_rate), 75);
    assert.equal(Number(cardnews.accuracy), 83.3); // 5 correct / 6 questions among completed FULL attempts.
    assert.equal(Number(all.paths.find(p => p.path === 'office').accuracy), 100);
    assert.equal((await records(admin, { admin: true, path: 'office' })).total, 1);
    assert.equal((await records(admin, { admin: true, topic: 'missing' })).total, 0);
    assert.equal((await records(admin, { admin: true, from: '2026-10-20T00:00:00+09:00' })).total, 0);
    const paged = await records(admin, { admin: true, limit: 1, offset: 1 });
    assert.equal(paged.total, all.total); assert.equal(paged.attempts.length, 1);
    assert.equal(paged.attempts[0].id, all.attempts[1].id);
    assert.equal(paged.comparisons.length, all.comparisons.length); // Summary is never limited to one page.
    assert.equal(all.visits.length, 2); assert.equal(all.visits.find(v => v.id === visitA).first_choice, 'files');
    assert.ok(all.visits.find(v => v.id === visitA).events.some(e => e.type === 'cardnews_opened'));
  });
  await t.test('review groups with equal question counts but different membership are not merged', async () => {
    const full = randomUUID(), otherReview = randomUUID();
    await emit(userA, visitA, 'quiz_started', { attemptId: full, quizVersionId: quiz });
    await emit(userA, visitA, 'answer_submitted', { attemptId: full, questionVersionId: q1, selectedOption: 'a' });
    await emit(userA, visitA, 'answer_submitted', { attemptId: full, questionVersionId: q2, selectedOption: 'a' });
    await emit(userA, visitA, 'quiz_completed', { attemptId: full });
    await emit(userA, visitA, 'quiz_started', { attemptId: otherReview, quizVersionId: quiz, mode: 'review', sourceAttemptId: full });
    await emit(userA, visitA, 'answer_submitted', { attemptId: otherReview, questionVersionId: q2, selectedOption: 'a,b' });
    await emit(userA, visitA, 'quiz_completed', { attemptId: otherReview });
    const groups = (await records(userA)).comparisons.filter(c => c.mode === 'review');
    assert.equal(groups.length, 2); assert.ok(groups.every(c => c.question_count === 1 && c.attempts === 1));
    assert.notEqual(groups[0].signature, groups[1].signature);
  });
  await t.test('visits without attempts are preserved; missing path evidence stays unclassified', async () => {
    const unclassifiedVisit = randomUUID();
    await emit(userA, unclassifiedVisit, 'visit_started');
    let report = await records(admin, { admin: true });
    assert.equal(report.visitTotal, 3);
    assert.equal(report.visits.find(v => v.id === unclassifiedVisit).first_choice, null);
    const attempt = randomUUID();
    await emit(userA, unclassifiedVisit, 'quiz_started', { attemptId: attempt, quizVersionId: quiz });
    report = await records(userA);
    assert.equal(report.attempts.find(a => a.id === attempt).path, 'unclassified');
    assert.equal(report.attempts.find(a => a.id === attempt).completed, false);
    assert.equal((await records(admin, { admin: true, path: 'office' })).visitTotal, 1);
  });
});
