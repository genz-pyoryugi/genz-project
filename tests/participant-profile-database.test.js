const test=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');

test('participant work experience is stored per visitor and joins AI 팀장 attempts, other events still go through', {timeout:120000}, async t=>{
  const db=new PGlite(); t.after(()=>db.close());
  await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;
    create table auth.users(id uuid primary key,is_anonymous boolean default true);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
  for(const file of ['202610160001_learning_tracking.sql','202610160002_multi_choice_and_listing.sql','202610200001_learning_history.sql','202610200002_quiz_progress.sql',
    '202610200003_simulation_attempts.sql','202610200004_simulation_learning_path.sql','202610220001_cardnews_self_check.sql','202610280001_participant_profile.sql'])
    await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
  const a=randomUUID(),b=randomUUID(),visit=randomUUID();
  await db.query('insert into auth.users values($1,true),($2,true)',[a,b]);
  async function as(user,fn){
    await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
    try{return await fn();}finally{await db.exec('reset role');}
  }
  let seq=0;
  const event=(type,fields={})=>({id:randomUUID(),visitId:visit,type,sequence:++seq,at:new Date(Date.now()+seq).toISOString(),...fields});
  const send=(user,p)=>as(user,()=>db.query('select public.lt_ingest($1::jsonb)',[JSON.stringify(p)]));
  const profile=experience=>event('participant_profile',{experience});

  await send(a,event('visit_started'));
  await send(a,profile('pre_job'));
  const again=profile('under_1m'); await send(a,again); await send(a,again); // a retried event is stored once; the latest answer counts
  await send(a,event('cardnews_self_check',{contentId:'first-day-adaptation',phase:'before',score:2,learningVersion:1}));

  await t.test('the latest answer per visitor is shown and joined to AI 팀장 first attempts',async()=>{
    const rows=(await db.query('select * from public.lt_participant_profiles')).rows;
    assert.equal(rows.length,1);
    assert.equal(rows[0].experience,'under_1m');
    assert.equal(Number((await db.query("select count(*) from public.lt_events where event_type='participant_profile'")).rows[0].count),2);
    await db.query(`insert into public.simulation_attempts(user_id,scenario_id,scenario_title,category,personality_key,personality_label,attempt,turns,total_score)
      values($1,'proc-03','승인','업무 절차&기준','busy','바쁜 팀장',1,2,9),($2,'proc-03','승인','업무 절차&기준','busy','바쁜 팀장',1,2,12)`,[a,b]);
    const by=(await db.query('select experience,avg_total from public.simulation_by_experience order by experience')).rows;
    assert.deepEqual(by.map(r=>[r.experience,Number(r.avg_total)]),[['under_1m',9],['unknown',12]]);
  });
  await t.test('invalid answers and other people\'s visits are rejected',async()=>{
    await assert.rejects(send(a,profile('ceo')),/Invalid experience/);
    await assert.rejects(send(a,event('participant_profile')),/Invalid experience/);
    await assert.rejects(send(b,profile('pre_job')),/Visit ownership mismatch/);
  });
  await t.test('existing event rules still apply and the delegate and views are not exposed',async()=>{
    await assert.rejects(send(a,event('made_up_event')),/Unknown event type/);
    await assert.rejects(send(a,event('cardnews_self_check',{contentId:'first-day-adaptation',phase:'before',score:9,learningVersion:1})),/Invalid score/);
    await assert.rejects(as(a,()=>db.query('select public.lt_ingest_before_profile($1::jsonb)',[JSON.stringify(event('quiz_opened'))])),e=>e.code==='42501');
    await assert.rejects(as(a,()=>db.query('select * from public.lt_participant_profiles')),e=>e.code==='42501');
    await assert.rejects(as(a,()=>db.query('select * from public.simulation_by_experience')),e=>e.code==='42501');
  });
});
