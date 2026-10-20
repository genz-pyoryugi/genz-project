require('./load-ts.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const catalog=require('./fixtures/reviewed-quiz-catalog.json');
const {freshRun,gradeRun}=require('../src/app/quiz/model.ts');
const {makeDraft,writeDraft,draftFor,drafts,canResume,hasWork,importLegacy}=require('../src/app/quiz/progress.ts');
const {queueDraft}=require('../src/app/quiz/progress-sync.ts');
const {saveQuiz}=require('../src/app/quiz/persistence.ts');
const ResumePrompt=require('../src/app/quiz/ResumePrompt.tsx').default;
const {Tracker}=require('../public/tracking/learning-tracker.js');
const {randomUUID}=require('node:crypto');
function storage(){const m=new Map();return {get length(){return m.size;},key:i=>[...m.keys()][i],getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}
const identity=(quiz,visitId=randomUUID())=>({id:randomUUID(),quizId:quiz.id,visitId});
const selected=()=>({...freshRun(),picked:[0]});
function backend(){
  const events=new Set(),answers=new Map(),attempts=new Map(),progress=new Map();
  let online=true,installed=true; const log=[];
  const client={auth:{getSession:async()=>({data:{session:{user:{id:'owner-a'},access_token:'token'}}})},rpc:async(name,args)=>{
    if(!online) return {error:{message:'network'}};
    if(name==='lt_catalog')return {data:catalog};
    if(name==='lt_learning_version')return {data:3};
    if(name==='lt_resume_progress')return installed?{data:[...progress.values()]}:{error:{code:'PGRST202'}};
    const p=args.p;
    if(['lt_save_progress','lt_abandon_progress'].includes(name)&&!installed)return {error:{code:'PGRST202'}};
    if(name==='lt_save_progress'){progress.set(p.attemptId,structuredClone(p.snapshot));log.push([name,p]);return {};}
    if(name==='lt_abandon_progress'){progress.delete(p.attemptId);log.push([name,p]);return {};}
    if(events.has(p.id))return {};
    events.add(p.id);log.push([name,p]);
    if(p.type==='quiz_started'&&!attempts.has(p.attemptId))attempts.set(p.attemptId,{completed:false});
    if(p.type==='answer_submitted'){
      const key=p.attemptId+':'+p.questionVersionId;
      if(answers.has(key)&&answers.get(key)!==p.selectedOption)return {error:{code:'P0001',message:'Answer already submitted'}};
      answers.set(key,p.selectedOption);
    }
    if(p.type==='quiz_completed')attempts.get(p.attemptId).completed=true;
    return {};
  }};
  return {client,answers,attempts,progress,log,online:value=>online=value,installed:value=>installed=value};
}

test('each anonymous owner and part keeps its own position, choices, immutable answers and version signature',()=>{
  const local=storage(),qA=catalog[0],qB=catalog[1],a=identity(qA),b=identity(qB);
  let run=gradeRun(selected(qA),qA.questions[0].id,false,[qA.questions[0].options[0].id]);
  // Use the actual right/wrong value for the selected option.
  const right=qA.questions[0].kind==='multi_choice'?qA.questions[0].correctOptions:[qA.questions[0].correctOption];
  run=gradeRun(selected(qA),qA.questions[0].id,right.length===1&&right[0]===qA.questions[0].options[0].id,[qA.questions[0].options[0].id]);
  const partA=makeDraft(qA,run,a),partB=makeDraft(qB,selected(qB),b);
  writeDraft(local,'owner-a',partA);writeDraft(local,'owner-a',partB);
  assert.equal(draftFor(local,'owner-a',qA).attempt.id,a.id);
  assert.equal(draftFor(local,'owner-a',qB).attempt.id,b.id);
  assert.equal(draftFor(local,'owner-b',qA),null);
  assert.deepEqual(draftFor(local,'owner-a',qA).run,run);
  assert.ok(canResume(partA,qA));assert.ok(partA.run.graded);
  assert.equal(qA.questions[partA.run.index].explanation,qA.questions[0].explanation);
  assert.ok(hasWork(partB));
});

test('refresh, leaving for office/cardnews and browser restart use the same durable part snapshots',()=>{
  const local=storage(),quiz=catalog[0],draft=makeDraft(quiz,selected(quiz),identity(quiz));
  writeDraft(local,'owner-a',draft);
  for(const navigation of ['another-part','cardnews','office','refresh','new-browser-session']){
    if(navigation==='another-part')writeDraft(local,'owner-a',makeDraft(catalog[1],selected(catalog[1]),identity(catalog[1])));
    const restored=draftFor(local,'owner-a',quiz);
    assert.equal(restored.attempt.id,draft.attempt.id,navigation);assert.deepEqual(restored.run.picked,[0],navigation);assert.ok(canResume(restored,quiz));
  }
});

test('start over archives the old attempt and never reimports abandoned legacy progress',()=>{
  const local=storage(),session=storage(),quiz=catalog[0],old=makeDraft(quiz,selected(quiz),identity(quiz));
  saveQuiz(session,'owner-a',old);importLegacy(local,session,'owner-a',catalog,randomUUID,randomUUID());
  writeDraft(local,'owner-a',{...old,state:'abandoned'});
  const fresh=makeDraft(quiz,freshRun(),identity(quiz));writeDraft(local,'owner-a',fresh);
  importLegacy(local,session,'owner-a',catalog,randomUUID,randomUUID());
  assert.equal(draftFor(local,'owner-a',quiz).attempt.id,fresh.attempt.id);
  assert.equal(drafts(local,'owner-a').archived[old.attempt.id].state,'abandoned');
  assert.notEqual(old.attempt.id,fresh.attempt.id);assert.deepEqual(old.run.picked,[0]);
});

test('changed quiz version, question order/revision or inconsistent submitted state cannot be resumed',()=>{
  const quiz=catalog[0],draft=makeDraft(quiz,selected(quiz),identity(quiz));
  for(const changed of [{...quiz,id:'new-version'},{...quiz,revision:2},{...quiz,questions:[...quiz.questions].reverse()},
    {...quiz,questions:[{...quiz.questions[0],revision:2},...quiz.questions.slice(1)]}])assert.equal(canResume(draft,changed),false);
  assert.equal(canResume({...draft,run:{...draft.run,graded:true}},quiz),false);
  assert.equal(canResume({...draft,run:{...draft.run,score:5}},quiz),false);
  const html=renderToStaticMarkup(React.createElement(ResumePrompt,{compatible:false,onContinue(){},onRestart(){}}));
  assert.match(html,/문제 버전·구성/);assert.match(html,/처음부터 풀기/);assert.doesNotMatch(html,/>이어 풀기</);
  const valid=renderToStaticMarkup(React.createElement(ResumePrompt,{compatible:true,onContinue(){},onRestart(){}}));
  assert.match(valid,/이전에 풀던 퀴즈가 있어요/);assert.match(valid,/>이어 풀기</);assert.match(valid,/같은 브라우저/);
});

test('offline selections survive tracker/browser restart, then synchronize with the same attempt after reconnect',async()=>{
  const s=backend(),local=storage(),session=storage(),tracker=new Tracker({storage:local,session,timers:false,getClient:async()=>s.client});
  await tracker.retry();s.online(false);
  const quiz=catalog[0],draft=makeDraft(quiz,selected(quiz),identity(quiz,tracker.currentVisitId()));
  writeDraft(local,'owner-a',draft);queueDraft(tracker,'owner-a',draft);await tracker.retry();
  assert.equal(tracker.status.state,'error');assert.ok(tracker.queue.items().length);
  assert.deepEqual(draftFor(local,'owner-a',quiz).run.picked,[0]);
  const reopened=new Tracker({storage:local,session:storage(),timers:false,getClient:async()=>s.client});
  await reopened.retry();s.online(true);await reopened.retry();
  assert.equal(reopened.status.state,'saved');assert.equal(reopened.queue.items().length,0);
  assert.equal(s.progress.get(draft.attempt.id).attempt.id,draft.attempt.id);
  assert.equal(s.answers.size,0);assert.equal(s.attempts.size,1);
});

test('resume replays a crash between local grading and outbox enqueue without duplicate answers or completion',async()=>{
  const s=backend(),local=storage(),quiz=catalog[0];
  const tracker=new Tracker({storage:local,session:storage(),timers:false,getClient:async()=>s.client});await tracker.retry();
  const attempt=identity(quiz,tracker.currentVisitId());
  const q=quiz.questions[0],ids=q.kind==='multi_choice'?q.correctOptions:[q.correctOption];
  const run=gradeRun({...freshRun(),picked:ids.map(id=>q.options.findIndex(o=>o.id===id))},q.id,true,ids);
  writeDraft(local,'owner-a',makeDraft(quiz,run,attempt)); // Crash before any event was queued.
  const restored=draftFor(local,'owner-a',quiz);
  queueDraft(tracker,'owner-a',restored);await tracker.retry();queueDraft(tracker,'owner-a',restored);await tracker.retry();
  assert.equal(s.attempts.size,1);assert.equal(s.answers.size,1);assert.equal(s.attempts.get(attempt.id).completed,false);
  assert.equal(s.progress.get(attempt.id).run.graded,true);
});

test('missing progress SQL keeps drafts queued without blocking submitted answers; applying SQL drains them',async()=>{
  const s=backend(),local=storage();s.installed(false);
  const tracker=new Tracker({storage:local,session:storage(),timers:false,getClient:async()=>s.client});await tracker.retry();
  const quiz=catalog[0],attempt=identity(quiz,tracker.currentVisitId()),q=quiz.questions[0];
  queueDraft(tracker,'owner-a',makeDraft(quiz,selected(quiz),attempt));
  const ids=q.kind==='multi_choice'?q.correctOptions:[q.correctOption];
  const run=gradeRun({...freshRun(),picked:ids.map(id=>q.options.findIndex(o=>o.id===id))},q.id,true,ids);
  queueDraft(tracker,'owner-a',makeDraft(quiz,run,attempt));await tracker.retry();
  assert.equal(s.answers.size,1);assert.equal(tracker.status.state,'error');assert.match(tracker.status.message,/202610200002_quiz_progress.sql/);
  assert.ok(tracker.queue.items().every(item=>item.event.type==='quiz_progress'));
  s.installed(true);await tracker.retry();assert.equal(tracker.status.state,'saved');assert.equal(tracker.queue.items().length,0);
});

test('cached public questions remain available when the Supabase/config network is unavailable',async()=>{
  const s=backend(),local=storage();
  const t=new Tracker({storage:local,session:storage(),timers:false,getClient:async()=>s.client});await t.retry();
  assert.equal((await t.catalog()).length,7);s.online(false);
  assert.equal((await t.catalog()).length,7);assert.equal(t.cachedOwner(),'owner-a');
  const offline=new Tracker({storage:local,session:storage(),timers:false,getClient:async()=>null});
  assert.equal((await offline.catalog()).length,7);
});

test('an anonymous identity change cannot send the prior owner draft under the new identity',async()=>{
  const s=backend(),local=storage();s.online(false);
  const t=new Tracker({storage:local,session:storage(),timers:false,getClient:async()=>s.client});
  const quiz=catalog[0],draft=makeDraft(quiz,selected(quiz),identity(quiz,t.currentVisitId()));
  writeDraft(local,'owner-a',draft);queueDraft(t,'owner-a',draft);await t.retry();
  s.client.auth.getSession=async()=>({data:{session:{user:{id:'owner-b'},access_token:'other'}}});
  s.online(true);const other=new Tracker({storage:local,session:storage(),timers:false,getClient:async()=>s.client});await other.retry();
  assert.equal(s.attempts.size,0);assert.equal(s.progress.size,0);assert.equal(draftFor(local,'owner-b',quiz),null);
});

test('legacy aggregate-only progress is preserved with an incompatibility reason instead of inferred answers',()=>{
  const local=storage(),session=storage(),quiz=catalog[0];
  saveQuiz(session,'owner-a',{quizId:quiz.id,attempt:identity(quiz),run:{...freshRun(),index:2,score:1,wrongIds:[quiz.questions[0].id]}});
  importLegacy(local,session,'owner-a',catalog,randomUUID,randomUUID());
  const draft=draftFor(local,'owner-a',quiz);assert.ok(draft);assert.equal(canResume(draft,quiz),false);assert.deepEqual(draft.run.answers,{});
});
