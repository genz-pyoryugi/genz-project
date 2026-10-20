// Client-side behaviour of public/tracking/learning-tracker.js against an in-memory fake of lt_ingest.
// Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const { Tracker } = require('../public/tracking/learning-tracker.js');

const mem = () => { const m = new Map(); return { get length() { return m.size; }, key: i => [...m.keys()][i],
  getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };

function fakeServer() {
  const events = new Map(); const log = []; let failNext = 0; let rejectType = null;
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } }, error: null }),
      signInAnonymously: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
    rpc: async (name, { p }) => {
      if (failNext > 0) { failNext--; return { error: { code: '', message: 'network' } }; }
      if (rejectType === p.type) return { error: { code: 'P0001', message: 'Invalid' } };
      const prior = events.get(p.id);
      if (prior) { if (JSON.stringify(prior) !== JSON.stringify(p)) return { error: { code: 'P0001', message: 'conflict' } }; return { error: null }; }
      events.set(p.id, p); log.push(p); return { error: null };
    } };
  return { client, events, log, fail: n => { failNext = n; }, reject: t => { rejectType = t; } };
}
const make = server => new Tracker({ storage: mem(), session: mem(), timers: false, getClient: async () => server.client });
const types = server => server.log.map(e => e.type);

test('office-first path is stored in order with a single first choice', async () => {
  const s = fakeServer(); const t = make(s);
  t.record('office_entered'); t.choose('postit'); t.record('office_object_opened', { object: 'postit' });
  t.choose('files'); t.record('cardnews_opened', { object: 'files' });
  await t.retry();
  assert.deepStrictEqual(types(s), ['visit_started', 'office_entered', 'first_choice', 'office_object_opened', 'cardnews_opened']);
  assert.strictEqual(s.log.filter(e => e.type === 'first_choice').length, 1);
  assert.strictEqual(s.log.find(e => e.type === 'first_choice').choice, 'postit');
  assert.strictEqual(new Set(s.log.map(e => e.visitId)).size, 1);
});

test('cardnews-first path keeps its own first choice', async () => {
  const s = fakeServer(); const t = make(s);
  t.choose('files'); t.record('cardnews_opened', { object: 'files' }); t.record('cardnews_last_slide');
  t.record('office_entered'); await t.retry();
  assert.deepStrictEqual(types(s), ['visit_started', 'first_choice', 'cardnews_opened', 'cardnews_last_slide', 'office_entered']);
  assert.strictEqual(s.log[1].choice, 'files');
});

test('retake produces separate attempts with distinct ids', async () => {
  const s = fakeServer(); const t = make(s);
  const run = () => { const a = t.newId(); t.record('quiz_started', { attemptId: a, quizVersionId: 'qv' });
    t.record('answer_submitted', { attemptId: a, questionVersionId: 'q1', selectedOption: 'a' });
    t.record('quiz_completed', { attemptId: a }); return a; };
  const a1 = run(), a2 = run(); await t.retry();
  assert.notStrictEqual(a1, a2);
  assert.strictEqual(s.log.filter(e => e.type === 'quiz_started').length, 2);
});

test('transient failure keeps events, retry sends each exactly once', async () => {
  const s = fakeServer(); const t = make(s);
  s.fail(2); t.record('office_entered'); await t.retry();
  assert.ok(t.queue.items().length > 0, 'events retained after failure');
  await t.retry(); await t.retry();
  assert.strictEqual(t.queue.items().length, 0);
  assert.strictEqual(s.log.length, new Set(s.log.map(e => e.id)).size);
  assert.deepStrictEqual(types(s), ['visit_started', 'office_entered']);
});

test('a re-sent event (lost response) is acknowledged without a duplicate', async () => {
  const s = fakeServer(); const t = make(s);
  t.record('office_entered'); await t.retry();
  const sent = s.log[1]; t.queue.enqueue({ ...sent });  // same id and payload again
  await t.retry();
  assert.strictEqual(s.log.length, 2); assert.strictEqual(t.queue.items().length, 0);
});

test('permanently rejected event is set aside and does not block later ones', async () => {
  const s = fakeServer(); const t = make(s);
  s.reject('cardnews_last_slide'); t.record('cardnews_last_slide'); t.record('office_entered'); await t.retry();
  assert.deepStrictEqual(types(s), ['visit_started', 'office_entered']);
  assert.strictEqual(t.queue.items().length, 0);
});

test('unconfigured Supabase keeps records on the device', async () => {
  const t = new Tracker({ storage: mem(), session: mem(), timers: false, getClient: async () => null });
  t.record('office_entered'); await t.retry();
  assert.strictEqual(t.status.state, 'unconfigured'); assert.strictEqual(t.queue.items().length, 2);
});

test('resumed quiz events keep their original visit even after a new visit begins', async () => {
  const s = fakeServer(); const t = make(s); await t.retry();
  const original = t.currentVisitId();
  for (let i = 0; i < 6; i++) t.record('office_object_opened', { object: 'phone' });
  await t.retry();
  const lastOriginalSequence = Math.max(...s.log.filter(e => e.visitId === original).map(e => e.sequence));
  t.visit.last = 1; t.record('office_entered');
  assert.notStrictEqual(t.visit.id, original);
  t.record('answer_submitted', { attemptId: 'existing', attemptVisitId: original, questionVersionId: 'q1', selectedOption: 'a' });
  await t.retry();
  assert.strictEqual(s.log.find(e => e.type === 'answer_submitted').visitId, original);
  assert.ok(s.log.find(e => e.type === 'answer_submitted').sequence > lastOriginalSequence);
});
test('permanent save rejections stay visible after retry and a tracker reload', async () => {
  const s = fakeServer(); const storage = mem(), session = mem();
  const t = new Tracker({ storage, session, timers: false, getClient: async () => s.client });
  s.reject('quiz_completed'); t.record('quiz_completed', { attemptId: 'missing' }); await t.retry();
  assert.strictEqual(t.status.state, 'error');
  await t.retry(); assert.strictEqual(t.status.state, 'error');
  const reloaded = new Tracker({ storage, session, timers: false, getClient: async () => s.client });
  await reloaded.retry(); assert.strictEqual(reloaded.status.state, 'error');
});

test('review persistence is enabled only after the new SQL capability is present', async () => {
  const s = fakeServer(); const rpc = s.client.rpc; let installed = false;
  s.client.rpc = async (name, args) => name === 'lt_learning_version'
    ? installed ? { data: 3 } : { error: { code: 'PGRST202' } } : rpc(name, args);
  const t = make(s); await t.retry();
  assert.strictEqual(await t.supportsHistory(), false);
  installed = true; assert.strictEqual(await t.supportsHistory(), true);
});

test('autosave reconnects after public configuration was temporarily unavailable', async () => {
  const s = fakeServer(); let available = false;
  const t = new Tracker({storage:mem(),session:mem(),timers:false,getClient:async()=>available ? s.client : null});
  t.record('office_entered'); await t.retry();
  assert.strictEqual(t.status.state,'unconfigured');
  available = true; await t.retry();
  assert.strictEqual(t.status.state,'saved'); assert.strictEqual(t.queue.items().length,0);
  assert.deepStrictEqual(types(s),['visit_started','office_entered']);
});

test('SQL upgrade automatically replays original rejected quiz records once without duplicates', async () => {
  const s = fakeServer(), storage=mem(),session=mem(); let installed=false;
  const rpc=s.client.rpc;
  s.client.rpc=async(name,args)=>name==='lt_learning_version' ? installed ? {data:3} : {error:{code:'PGRST202'}} : rpc(name,args);
  const t=new Tracker({storage,session,timers:false,getClient:async()=>s.client});
  s.reject('quiz_started'); t.record('quiz_started',{attemptId:'original',quizVersionId:'qv'}); await t.retry();
  assert.strictEqual(t.status.state,'error');
  const rejectedKey=Array.from({length:storage.length},(_,i)=>storage.key(i)).find(k=>k.startsWith('genz.lt.rejected'));
  const original=JSON.parse(storage.getItem(rejectedKey)).item.event;
  installed=true; s.reject(null); await t.supportsHistory(); await t.retry();
  assert.strictEqual(t.status.state,'saved'); assert.strictEqual(storage.getItem(rejectedKey),null);
  assert.deepStrictEqual(s.events.get(original.id),original);
  await t.retry(); assert.strictEqual(s.log.filter(e=>e.id===original.id).length,1);
});

test('invalid records remain visibly rejected after one upgrade replay, including after reload', async () => {
  const s=fakeServer(),storage=mem(),session=mem(); const rpc=s.client.rpc;
  s.client.rpc=async(name,args)=>name==='lt_learning_version' ? {data:3} : rpc(name,args);
  const t=new Tracker({storage,session,timers:false,getClient:async()=>s.client});
  s.reject('quiz_completed'); t.record('quiz_completed',{attemptId:'missing'}); await t.retry();
  await t.retry(); await t.retry();
  const key=Array.from({length:storage.length},(_,i)=>storage.key(i)).find(k=>k.startsWith('genz.lt.rejected'));
  assert.strictEqual(JSON.parse(storage.getItem(key)).item.recoveryVersion,3);
  const reloaded=new Tracker({storage,session,timers:false,getClient:async()=>s.client}); await reloaded.retry();
  assert.strictEqual(reloaded.status.state,'error'); assert.strictEqual(reloaded.queue.items().length,0);
});

test('upgrade recovery never reassigns rejected events belonging to another anonymous user', async () => {
  const {DurableQueue}=require('../public/tracking/learning-tracker.js'); const storage=mem();
  storage.setItem('genz.lt.rejected.v1.event',JSON.stringify({item:{owner:'someone-else',event:{id:'event',type:'quiz_started'}},reason:'23505 duplicate'}));
  const queue=new DurableQueue(storage);
  assert.strictEqual(queue.recoverAfterUpgrade('u1'),0);
  assert.ok(storage.getItem('genz.lt.rejected.v1.event')); assert.strictEqual(queue.items().length,0);
});

test('a matching server acknowledgement resolves an old failure and keeps its diagnostic archive', async()=>{
  const s=fakeServer(),storage=mem(),session=mem();
  const t=new Tracker({storage,session,timers:false,getClient:async()=>s.client});await t.retry();
  s.reject('quiz_started');t.record('quiz_started',{attemptId:'same',quizVersionId:'qv'});await t.retry();
  assert.strictEqual(t.status.state,'error');
  s.reject(null);t.record('quiz_started',{attemptId:'same',quizVersionId:'qv'});await t.retry();
  assert.strictEqual(t.status.state,'saved');assert.strictEqual(t.queue.hasRejected('u1'),false);
  assert.ok(Array.from({length:storage.length},(_,i)=>storage.key(i)).some(k=>k.startsWith('genz.lt.resolved.v1.')));
});

test('an acknowledgement with another answer never hides a real rejected answer', async()=>{
  const s=fakeServer(),t=make(s);await t.retry();
  s.reject('answer_submitted');t.record('answer_submitted',{attemptId:'same',questionVersionId:'q1',selectedOption:'b'});await t.retry();
  s.reject(null);t.record('answer_submitted',{attemptId:'same',questionVersionId:'q1',selectedOption:'a'});await t.retry();
  assert.strictEqual(t.status.state,'error');assert.strictEqual(t.queue.rejections('u1').length,1);
});

test('current successful progress and historical failures are reported separately, without assuming an unacknowledged draft is saved', async()=>{
  const s=fakeServer(),t=make(s);await t.retry();
  s.reject('quiz_completed');t.record('quiz_completed',{attemptId:'previous'});await t.retry();
  s.reject(null);t.record('quiz_progress',{attemptId:'current',snapshot:{}});await t.retry();
  assert.strictEqual(t.status.state,'error');
  const current=t.statusFor('current');assert.strictEqual(current.state,'saved');assert.strictEqual(current.issues.length,0);
  assert.strictEqual(current.historicalIssues.length,1);assert.strictEqual(t.statusFor('previous').state,'error');
  assert.notStrictEqual(t.statusFor('never-sent').state,'saved');
  s.fail(1);t.record('quiz_progress',{attemptId:'current',snapshot:{}});await t.retry();
  assert.strictEqual(t.statusFor('current').state,'error'); // Historical failures cannot hide a fresh outage.
});

test('new progress after a browser restart keeps increasing the original visit sequence', async()=>{
  const s=fakeServer(),storage=mem();
  const first=new Tracker({storage,session:mem(),timers:false,getClient:async()=>s.client});await first.retry();
  const visit=first.currentVisitId();first.record('quiz_progress',{attemptId:'same',attemptVisitId:visit,snapshot:{index:0}});await first.retry();
  const before=s.log.findLast(e=>e.type==='quiz_progress').sequence;
  const reopened=new Tracker({storage,session:mem(),timers:false,getClient:async()=>s.client});
  reopened.record('quiz_progress',{attemptId:'same',attemptVisitId:visit,snapshot:{index:1}});await reopened.retry();
  const after=s.log.findLast(e=>e.type==='quiz_progress');
  assert.strictEqual(after.visitId,visit);assert.ok(after.sequence>before);
});
