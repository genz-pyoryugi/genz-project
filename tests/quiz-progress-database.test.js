require('./load-ts.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
const {makeDraft}=require('../src/app/quiz/progress.ts');
const {freshRun,gradeRun}=require('../src/app/quiz/model.ts');

test('durable progress SQL preserves immutable grading, ownership and unfinished attempts', {timeout:120000}, async t=>{
  const db=new PGlite(); t.after(()=>db.close());
  await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;
    create table auth.users(id uuid primary key,is_anonymous boolean default true);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
  for(const file of ['202610160001_learning_tracking.sql','202610160002_multi_choice_and_listing.sql','202610200001_learning_history.sql','202610200002_quiz_progress.sql'])
    await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
  const a=randomUUID(),b=randomUUID(),visit=randomUUID(),qid=randomUUID(),other=randomUUID(),q1=randomUUID(),q2=randomUUID();
  await db.query('insert into auth.users values($1,true),($2,true)',[a,b]);
  await db.query("insert into public.lt_quiz_versions(id,quiz_key,revision,title) values($1,'part-a',1,'파트 A'),($2,'part-b',1,'파트 B')",[qid,other]);
  for(const [id,key] of [[q1,'one'],[q2,'two']]) await db.query(`insert into public.lt_question_versions(id,question_key,revision,kind,prompt,options,correct_option,explanation)
    values($1,$2,1,'single_choice','문제','[{"id":"a","text":"정답"},{"id":"b","text":"오답"}]','a','실제 해설')`,[id,key]);
  await db.query('insert into public.lt_quiz_items values($1,$3,1),($1,$4,2),($2,$3,1),($2,$4,2)',[qid,other,q1,q2]);
  await db.exec('update public.lt_quiz_versions set published=true');
  async function as(user,fn,role='authenticated'){
    await db.exec('set role '+role);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);
    try{return await fn();}finally{await db.exec('reset role');}
  }
  let seq=0;
  const event=(type,fields={})=>({id:randomUUID(),visitId:visit,type,sequence:++seq,at:new Date().toISOString(),...fields});
  const rpc=(user,name,p)=>as(user,()=>db.query(`select public.${name}($1::jsonb)`,[JSON.stringify(p)]));
  const send=(type,fields)=>rpc(a,'lt_ingest',event(type,fields));
  const read=(user)=>as(user,async()=>(await db.query('select public.lt_resume_progress() as data')).rows[0].data);
  await send('visit_started');
  const quiz={id:qid,quizKey:'part-a',revision:1,title:'파트 A',questions:[q1,q2].map(id=>({id,revision:1,kind:'single_choice',options:[{id:'a'},{id:'b'}],correctOption:'a'}))};
  const identity={id:randomUUID(),quizId:qid,visitId:visit};
  await send('quiz_started',{attemptId:identity.id,quizVersionId:qid});
  let run={...freshRun(),picked:[1]};
  const save=()=>rpc(a,'lt_save_progress',event('quiz_progress',{attemptId:identity.id,snapshot:makeDraft(quiz,run,identity)}));

  await t.test('unsubmitted choice and immutable question order synchronize without creating an official answer',async()=>{
    await save(); const rows=await read(a);
    assert.deepEqual(rows[0].run.picked,[1]);assert.equal(rows[0].attempt.id,identity.id);
    assert.deepEqual(rows[0].questionIds,[q1,q2]);assert.deepEqual(rows[0].questionRevisions,[1,1]);
    assert.equal((await db.query('select count(*)::int as n from public.lt_answers')).rows[0].n,0);
  });
  await t.test('different anonymous users cannot read, overwrite or abandon this draft; delegate is not exposed',async()=>{
    assert.deepEqual(await read(b),[]);
    assert.equal((await as(b,()=>db.query('select * from public.lt_quiz_progress'))).rows.length,0);
    await assert.rejects(rpc(b,'lt_save_progress',event('quiz_progress',{attemptId:identity.id,snapshot:makeDraft(quiz,run,identity)})),/ownership/);
    await assert.rejects(rpc(b,'lt_abandon_progress',event('quiz_abandoned',{attemptId:identity.id})),/ownership/);
    await assert.rejects(as(a,()=>db.query('select public.lt_ingest_before_progress($1::jsonb)',[JSON.stringify(event('quiz_opened'))])),e=>e.code==='42501');
    await assert.rejects(as(null,()=>db.query('select public.lt_resume_progress()'),'anon'),e=>e.code==='42501');
  });
  await t.test('submitted answer and explanation state resume; client score is replaced by server grading',async()=>{
    await send('answer_submitted',{attemptId:identity.id,questionVersionId:q1,selectedOption:'b'});
    run=gradeRun(run,q1,false,['b']); await save();
    const forged=makeDraft(quiz,{...run,score:999},identity);
    await rpc(a,'lt_save_progress',event('quiz_progress',{attemptId:identity.id,snapshot:forged}));
    const restored=(await read(a))[0];assert.equal(restored.run.graded,true);assert.equal(restored.run.score,0);
    assert.deepEqual(restored.run.answers[q1],{selectedOptions:['b'],correct:false});
    await assert.rejects(rpc(a,'lt_save_progress',event('quiz_progress',{attemptId:identity.id,snapshot:makeDraft(quiz,{...run,picked:[0]},identity)})),/immutable/);
    await assert.rejects(send('answer_submitted',{attemptId:identity.id,questionVersionId:q1,selectedOption:'a'}),/already submitted/);
  });
  await t.test('forward movement, stale/offline drafts and retries do not regress progress or duplicate scores',async()=>{
    const old=event('quiz_progress',{attemptId:identity.id,snapshot:makeDraft(quiz,run,identity)});
    run={...run,index:1,picked:[0],graded:false}; await save();
    await rpc(a,'lt_save_progress',old);
    assert.equal((await read(a))[0].run.index,1);
    const stale=makeDraft(quiz,{...freshRun(),picked:[1]},identity);
    await rpc(a,'lt_save_progress',event('quiz_progress',{attemptId:identity.id,snapshot:stale}));
    assert.equal((await read(a))[0].run.index,1);
    await send('answer_submitted',{attemptId:identity.id,questionVersionId:q1,selectedOption:'b'});
    assert.equal((await db.query('select answered_count from public.lt_attempts where id=$1',[identity.id])).rows[0].answered_count,1);
  });
  await t.test('incomplete runs are excluded from final comparisons; completing retains original attempt identity',async()=>{
    let report=(await as(a,()=>db.query('select public.lt_records() as data'))).rows[0].data;
    assert.deepEqual(report.comparisons,[]);assert.equal(report.attempts[0].completed,false);
    await send('answer_submitted',{attemptId:identity.id,questionVersionId:q2,selectedOption:'a'});
    run=gradeRun(run,q2,true,['a']);await send('quiz_completed',{attemptId:identity.id});await save();
    assert.equal((await read(a))[0].state,'active'); // Last submitted explanation remains resumable.
    run={...run,index:2,picked:[],graded:false};await save();await save();
    const restored=(await read(a))[0];assert.equal(restored.state,'completed');assert.equal(restored.attempt.id,identity.id);
    report=(await as(a,()=>db.query('select public.lt_records() as data'))).rows[0].data;
    assert.equal(report.comparisons[0].attempts,1);assert.equal(report.attempts[0].correct_count,1);
    assert.equal(report.attempts[0].answered_count,2);
  });
  await t.test('start over preserves an abandoned attempt and refuses later writes to it',async()=>{
    const abandoned={id:randomUUID(),quizId:qid,visitId:visit};
    await send('quiz_started',{attemptId:abandoned.id,quizVersionId:qid});
    const snapshot=makeDraft(quiz,{...freshRun(),picked:[0]},abandoned);
    await rpc(a,'lt_save_progress',event('quiz_progress',{attemptId:abandoned.id,snapshot}));
    await rpc(a,'lt_abandon_progress',event('quiz_abandoned',{attemptId:abandoned.id,snapshot}));
    await rpc(a,'lt_abandon_progress',event('quiz_abandoned',{attemptId:abandoned.id,snapshot}));
    const row=(await db.query('select * from public.lt_quiz_progress where attempt_id=$1',[abandoned.id])).rows[0];
    assert.equal(row.status,'abandoned');assert.ok(row.abandoned_at);
    await assert.rejects(send('answer_submitted',{attemptId:abandoned.id,questionVersionId:q1,selectedOption:'a'}),/abandoned/);
    const report=(await as(a,()=>db.query('select public.lt_records() as data'))).rows[0].data;
    assert.equal(report.comparisons[0].attempts,1);
    assert.ok(!((await read(a)).some(d=>d.attempt.id===abandoned.id)));
  });
  await t.test('another part remains independently resumable and membership/version changes are rejected',async()=>{
    const second={id:randomUUID(),quizId:other,visitId:visit},otherQuiz={...quiz,id:other,quizKey:'part-b'};
    await send('quiz_started',{attemptId:second.id,quizVersionId:other});
    await rpc(a,'lt_save_progress',event('quiz_progress',{attemptId:second.id,snapshot:makeDraft(otherQuiz,{...freshRun(),picked:[1]},second)}));
    assert.equal((await read(a)).length,2);
    const wrong=makeDraft(otherQuiz,{...freshRun(),picked:[1]},second);wrong.questionIds.reverse();
    await assert.rejects(rpc(a,'lt_save_progress',event('quiz_progress',{attemptId:second.id,snapshot:wrong})),/version mismatch/);
    const catalog=(await as(a,()=>db.query('select public.lt_catalog() as data'))).rows[0].data;
    assert.equal(catalog.find(q=>q.id===other).quizKey,'part-b');
  });
  await t.test('wrong-question review restores its frozen subset and original source, separately from the full attempt',async()=>{
    const review={id:randomUUID(),quizId:qid,visitId:visit};
    await send('quiz_started',{attemptId:review.id,quizVersionId:qid,mode:'review',sourceAttemptId:identity.id});
    let reviewRun={...freshRun([q1],identity.id),picked:[0]};
    await rpc(a,'lt_save_progress',event('quiz_progress',{attemptId:review.id,snapshot:makeDraft(quiz,reviewRun,review)}));
    let restored=(await read(a)).find(d=>d.quizId===qid);
    assert.deepEqual(restored.run.reviewIds,[q1]);assert.equal(restored.run.sourceAttemptId,identity.id);assert.equal(restored.attempt.id,review.id);
    await send('answer_submitted',{attemptId:review.id,questionVersionId:q1,selectedOption:'a'});
    await send('quiz_completed',{attemptId:review.id});reviewRun=gradeRun(reviewRun,q1,true,['a']);
    await rpc(a,'lt_save_progress',event('quiz_progress',{attemptId:review.id,snapshot:makeDraft(quiz,reviewRun,review)}));
    restored=(await read(a)).find(d=>d.quizId===qid);assert.equal(restored.run.score,1);assert.equal(restored.run.graded,true);
    assert.equal(Object.keys(restored.run.answers).length,1);
  });
});
