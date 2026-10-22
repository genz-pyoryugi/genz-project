const test=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');

test('card news self-check scores are stored per visit and summarised, other events still go through', {timeout:120000}, async t=>{
  const db=new PGlite(); t.after(()=>db.close());
  await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;
    create table auth.users(id uuid primary key,is_anonymous boolean default true);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
  for(const file of ['202610160001_learning_tracking.sql','202610160002_multi_choice_and_listing.sql','202610200001_learning_history.sql','202610200002_quiz_progress.sql','202610220001_cardnews_self_check.sql'])
    await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
  const a=randomUUID(),b=randomUUID(),visit=randomUUID();
  await db.query('insert into auth.users values($1,true),($2,true)',[a,b]);
  async function as(user,fn){
    await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
    try{return await fn();}finally{await db.exec('reset role');}
  }
  let seq=0;
  const event=(type,fields={})=>({id:randomUUID(),visitId:visit,type,sequence:++seq,at:new Date().toISOString(),...fields});
  const send=(user,p)=>as(user,()=>db.query('select public.lt_ingest($1::jsonb)',[JSON.stringify(p)]));
  const check=(phase,score,contentId='first-day-adaptation')=>event('cardnews_self_check',{contentId,phase,score,learningVersion:1});

  await send(a,event('visit_started'));
  await send(a,event('cardnews_opened',{object:'files'}));
  await send(a,check('before',2));
  await send(a,check('after',4));
  const same=check('after',5); await send(a,same); await send(a,same); // a retried event is stored once

  await t.test('scores are stored and the admin summary shows before → after',async()=>{
    const rows=(await db.query("select * from public.lt_cardnews_self_check_summary")).rows;
    assert.equal(rows.length,1);
    assert.equal(rows[0].content_id,'first-day-adaptation');
    assert.equal(Number(rows[0].before_count),1);assert.equal(Number(rows[0].before_avg),2);
    assert.equal(Number(rows[0].after_count),2);assert.equal(Number(rows[0].after_avg),4.5);
  });
  await t.test('invalid scores, phases, content ids and other people\'s visits are rejected',async()=>{
    await assert.rejects(send(a,check('before',0)),/Invalid score/);
    await assert.rejects(send(a,check('before',6)),/Invalid score/);
    await assert.rejects(send(a,check('during',3)),/Invalid phase/);
    await assert.rejects(send(a,check('before',3,'<script>')),/Invalid content id/);
    await assert.rejects(send(b,check('before',3)),/Visit ownership mismatch/);
  });
  await t.test('existing event rules still apply and the delegate is not exposed',async()=>{
    await assert.rejects(send(a,event('made_up_event')),/Unknown event type/);
    await assert.rejects(as(a,()=>db.query('select public.lt_ingest_before_self_check($1::jsonb)',[JSON.stringify(event('quiz_opened'))])),e=>e.code==='42501');
    await assert.rejects(as(a,()=>db.query('select * from public.lt_cardnews_self_check_summary')),e=>e.code==='42501');
  });
});
